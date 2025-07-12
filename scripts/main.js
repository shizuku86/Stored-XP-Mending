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

system.runInterval(() => {
    const players = world.getPlayers();

    players.forEach((player) => {
        const equippable = player.getComponent("equippable");

        const tools = equipmentSlots.map(equip => equippable.getEquipment(equip));

        tools.forEach((tool, index) => {
            if (mendingIntervals[index] > 0) {
                mendingIntervals[index] -= 1;
            }

            if (mendingTool(player, tool)) {
                equippable.setEquipment(equipmentSlots[index], tool);
                mendingIntervals[index] = 5;
            }
        });
    });
});

function mendingTool(player, tool) {
    const durability = tool.getComponent("minecraft:durability");
    const enchantable = tool.getComponent("minecraft:enchantable");
    if (!durability || !enchantable) return false;

    const hasMending = enchantable.hasEnchantment("minecraft:mending");
    if (!hasMending) return false;
    
    const beforeTotalXp = player.getTotalXp();
    if (durability.damage > 0 && beforeTotalXp > 0) {
        player.addExperience(-1);
        durability.damage = Math.max(durability.damage -2, 0);

        const afterTotalXp = player.getTotalXp();
        if (afterTotalXp > 0 && beforeTotalXp === afterTotalXp && player.level > 0) {
            player.addLevel(-1);
            const totalXpNeededForNextLevel = player.totalXpNeededForNextLevel -1;
            const totalXp = player.getTotalXp();
            player.resetLevel();

            player.addExperience(totalXpNeededForNextLevel + totalXp);
        }

        return true;
    }

    return false;
}