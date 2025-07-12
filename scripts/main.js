import { world, system } from "@minecraft/server";

system.runInterval(() => {
    const players = world.getPlayers();

    players.forEach((player) => {
        const container = player.getComponent("inventory").container;
        const equippable = player.getComponent("equippable");

        const rightHandItem = container.getItem(player.selectedSlotIndex);
        const leftHandITem = equippable.getEquipment("Offhand");
        
        if (rightHandItem) {
            const durability = rightHandItem.getComponent("minecraft:durability");
            const enchantable = rightHandItem.getComponent("minecraft:enchantable");
            if (!durability || !enchantable) return;

            const hasMending = enchantable.hasEnchantment("minecraft:mending");
            const currentDurability = durability?.maxDurability - durability?.damage;
            
            if (hasMending && currentDurability < durability.maxDurability && player.getTotalXp() > 0) {
                const a = player.getTotalXp();
                player.addExperience(-1);
                if (player.getTotalXp() > 0 && player.getTotalXp() === a) {
                    player.addLevels(-1);
                    const b = player.totalXpNeededForNextLevel -1;
                    const c = player.getTotalXp();
                    player.resetLevel();
                    player.addExperience(b);
                    player.addExperience(c);
                }

                durability.damage -= 1;
                container.setItem(player.selectedSlotIndex, rightHandItem);
            }
        }
    });
});