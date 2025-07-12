import { world, system } from "@minecraft/server";

const equipmentSlots = [
    "Mainhand",
    "Offhand",
    "Head",
    "Chest",
    "Feet",
    "Legs"
]

const mendingIntervals = equipmentSlots.map(() => 0);

world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
    const { block, isFirstEvent, itemStack, player } = ev;

    if (!isFirstEvent) return;
    if (!player.isSneaking) return;
    if (block.typeId !== "minecraft:grindstone") return;
    if (!isTool(itemStack)) return;

    ev.cancel = true;
    system.run(() => player.playSound("block.grindstone.use"));
    player.setDynamicProperty("isMending", true);
    player.setDynamicProperty("mendingSlot", player.selectedSlotIndex);
});

world.afterEvents.entityHitBlock.subscribe(ev => {
    const { hitBlock, damagingEntity } = ev;

    if (damagingEntity.typeId !== "minecraft:player") return;
    if (!damagingEntity.isSneaking) return;
    if (hitBlock.typeId !== "minecraft:grindstone") return;

    const container = damagingEntity.getComponent("inventory").container;
    const itemStack = container.getItem(damagingEntity.selectedSlotIndex);
    if (!isTool(itemStack)) return;

    system.run(() => player.playSound("block.grindstone.use"));
    player.setDynamicProperty("isMending", true);
    player.setDynamicProperty("mendingSlot", player.selectedSlotIndex);
});

system.runInterval(() => {
    const players = world.getPlayers();

    players.forEach((player) => {
        if (!player.getDynamicProperty("isMending")) return;
        if (player.getDynamicProperty("mendingSlot") !== player.selectedSlotIndex) {
            const container = player.getComponent("inventory").container;
            const itemStack = container.getItem(player.selectedSlotIndex);
            if (isTool(itemStack)) {
                player.setDynamicProperty("mendingSlot", player.selectedSlotIndex);
            }
            else {
                player.setDynamicProperty("isMending", false);
                return;
            }
        }

        const equippable = player.getComponent("equippable");
        const tools = equipmentSlots.map(equip => equippable.getEquipment(equip));
        const intervals = JSON.parse(player.getDynamicProperty("mendingIntervals") ?? JSON.stringify(mendingIntervals));

        tools.forEach((tool, index) => {
            if (intervals[index] > 0) {
                intervals[index] -= 1;
                return;
            }

            if (mendingTool(player, tool)) {
                equippable.setEquipment(equipmentSlots[index], tool);
                intervals[index] = Math.ceil(Math.random() * 3);
            }
        });

        player.setDynamicProperty("mendingIntervals", JSON.stringify(intervals));
    });
});

function mendingTool(player, tool) {
    if (!tool) return false;

    const durability = tool.getComponent("minecraft:durability");
    const enchantable = tool.getComponent("minecraft:enchantable");
    if (!durability || !enchantable) return false;

    const hasMending = enchantable.hasEnchantment("minecraft:mending");
    if (!hasMending) return false;
    
    const maxMendingCount = 5;
    for (let i = 0; i< maxMendingCount; i++) {
        const beforeTotalXp = player.getTotalXp();
        if (durability.damage === 0 || beforeTotalXp === 0) return false;
        player.addExperience(-1);

        const afterTotalXp = player.getTotalXp();
        if (afterTotalXp > 0 && beforeTotalXp === afterTotalXp && player.level > 0) {
            player.addLevels(-1);
            const totalXpNeededForNextLevel = player.totalXpNeededForNextLevel -1;
            const totalXp = player.getTotalXp();
            player.resetLevel();

            player.addExperience(totalXpNeededForNextLevel + totalXp);
        }

        durability.damage = Math.max(durability.damage -2, 0);
        if (durability.damage === 0 || beforeTotalXp === 0) break;
    }

    return true;
}

function isTool(itemStack) {
    if (!itemStack) return false;
    const durability = itemStack.getComponent("minecraft:durability");
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!durability || !enchantable) return false;
    return true;
}