import { getSeoProfitSignals } from './getSeoProfitSignals.js';
import { getSeoCityRegistry } from './seoCityRegistry.js';

const EMPTY_ACTIONS = {
  promote: [],
  maintain: [],
  demote: [],
  freeze: []
};

function classifyAction(profitTier) {
  if (profitTier === 'high') {
    return 'promote';
  }

  if (profitTier === 'medium') {
    return 'maintain';
  }

  if (profitTier === 'low') {
    return 'demote';
  }

  if (profitTier === 'loss') {
    return 'freeze';
  }

  return 'maintain';
}

export async function getSeoPromotionActions(supabase) {
  if (!supabase) {
    return { ...EMPTY_ACTIONS };
  }

  try {
    const [profitSignals, registry] = await Promise.all([
      getSeoProfitSignals(supabase),
      getSeoCityRegistry(supabase)
    ]);

    if (!profitSignals || typeof profitSignals !== 'object') {
      return { ...EMPTY_ACTIONS };
    }

    const actions = {
      promote: [],
      maintain: [],
      demote: [],
      freeze: []
    };

    for (const [slug, entry] of Object.entries(profitSignals)) {
      if (!slug) {
        continue;
      }

      const registryEntry = registry && registry[slug];
      if (!registryEntry || registryEntry.eligible !== true) {
        continue;
      }

      const tier = entry && entry.profitTier ? entry.profitTier : 'medium';
      const action = classifyAction(tier);

      if (actions[action]) {
        actions[action].push(slug);
      }
    }

    return actions;
  } catch (error) {
    console.error('getSeoPromotionActions error', error);
    return { ...EMPTY_ACTIONS };
  }
}

