import { world, system } from "@minecraft/server";

const equipmentSlots = [
    "Mainhand",
    "Offhand",
    "Head",
    "Chest",
    "Feet",
    "Legs"
]

const mendingId = "minecraft:mending";
const triggerBlockId = "minecraft:grindstone";

function initData() {
    return {
        "isMending": false,
        "mendingSlot": 0,
        "mendingIntervals": equipmentSlots.map(() => 0)
    }
}

const playerMap = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
    const { block, isFirstEvent, itemStack, player } = ev;

    if (!isFirstEvent) return;
    if (!mendingTrigger(player, block)) return;
    
    ev.cancel = true;
});

world.afterEvents.entityHitBlock.subscribe(ev => {
    const { hitBlock, damagingEntity } = ev;

    if (damagingEntity.typeId !== "minecraft:player") return;
    mendingTrigger(damagingEntity, hitBlock);
});

world.afterEvents.playerLeave.subscribe(ev => {
    playerMap.delete(ev.playerId);
});

function mendingTrigger(player, block) {
    if (block.typeId !== triggerBlockId) return false;
    if (!player.isSneaking) return false;

    const container = player.getComponent("inventory").container;
    const itemStack = container.getItem(player.selectedSlotIndex);
    if (!isMendingTool(itemStack)) return false;

    system.run(() => player.playSound("block.grindstone.use"));
    const playerData = playerMap.get(player.id) ?? initData();
    playerData.isMending = true;
    playerData.mendingSlot = player.selectedSlotIndex;
    playerMap.set(player.id, playerData);

    return true;
}

system.runInterval(() => {
    const players = world.getPlayers();
    players.forEach((player) => {
        const playerData = playerMap.get(player.id) ?? initData();
        playerMap.set(player.id, playerData);

        if (!playerData.isMending) return;
        if (playerData.mendingSlot !== player.selectedSlotIndex) {
            const container = player.getComponent("inventory").container;
            const itemStack = container.getItem(player.selectedSlotIndex);
            if (isMendingTool(itemStack)) {
                playerData.mendingSlot = player.selectedSlotIndex;
            }
            else {
                playerData.isMending = false;
                return;
            }
        }

        const equippable = player.getComponent("equippable");
        const tools = equipmentSlots.map(equip => equippable.getEquipment(equip));
        const intervals = playerData.mendingIntervals;

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
    });
});

function mendingTool(player, tool) {
    if (!tool) return false;

    const durability = tool.getComponent("minecraft:durability");
    const enchantable = tool.getComponent("minecraft:enchantable");
    if (!durability || !enchantable) return false;

    const hasMending = enchantable.hasEnchantment(mendingId);
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

function isMendingTool(itemStack) {
    if (!itemStack) return false;
    const durability = itemStack.getComponent("minecraft:durability");
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!durability || !enchantable) return false;

    const hasMending = enchantable.hasEnchantment(mendingId);
    if (!hasMending) return false;

    return true;
}