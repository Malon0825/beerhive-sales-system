/**
 * Customer Tier Enumeration
 * Defines VIP tier levels for customers
 */
export enum CustomerTier {
  REGULAR = 'regular',
  VIP_SILVER = 'vip_silver',
  VIP_GOLD = 'vip_gold',
  VIP_PLATINUM = 'vip_platinum',
}

export type CustomerTierType = `${CustomerTier}`;
