import { TransactionBlock } from '@mysten/sui.js/transactions';
import { BCS, getSuiMoveConfig } from '@mysten/bcs';
import BigNumber from 'bignumber.js';
import { suiClockAddress } from '@sonarwatch/portfolio-core';
import { SuiClient } from '../../utils/clients/types';
import {
  incentiveFunction,
  incentiveObjectId,
  incentiveStorageObjectId,
  rateFactor,
  rewardsFunds,
} from './constants';
import { Pool } from './types';

const bcs = new BCS(getSuiMoveConfig());

bcs.registerStructType('IncentivePoolInfo', {
  pool_id: 'address',
  funds: 'address',
  phase: 'u64',
  start_at: 'u64',
  end_at: 'u64',
  closed_at: 'u64',
  total_supply: 'u64',
  asset_id: 'u8',
  option: 'u8',
  factor: 'u256',
  distributed: 'u64',
  available: 'u256',
  total: 'u256',
});

bcs.registerStructType('IncentivePoolInfoByPhase', {
  phase: 'u64',
  pools: 'vector<IncentivePoolInfo>',
});

function getSupplyRewardsTransactionBlock(owner: string) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: incentiveFunction,
    arguments: [
      tx.object(suiClockAddress),
      tx.object(incentiveObjectId),
      tx.object(incentiveStorageObjectId),
      tx.pure(0),
      tx.pure(1),
      tx.pure(owner),
    ],
  });

  return tx;
}

function getBorrowRewardsTransactionBlock(owner: string) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: incentiveFunction,
    arguments: [
      tx.object(suiClockAddress),
      tx.object(incentiveObjectId),
      tx.object(incentiveStorageObjectId),
      tx.pure(1),
      tx.pure(3),
      tx.pure(owner),
    ],
  });

  return tx;
}

async function getRewardPoolsData(
  client: SuiClient,
  tx: TransactionBlock,
  owner: string
): Promise<{ phase: string; pools: Pool[] }[]> {
  const rewardsPoolsInfos = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: owner,
  });

  if (rewardsPoolsInfos.results && rewardsPoolsInfos.results[0].returnValues) {
    const o = rewardsPoolsInfos.results[0].returnValues;

    return o
      .map((e) =>
        bcs.de('vector<IncentivePoolInfoByPhase>', Uint8Array.from(e[0]))
      )
      .flat()
      .sort((e, n) => Number(n.phase) - Number(e.phase));
  }

  return [];
}

export async function getAvailableRewards(
  client: SuiClient,
  owner: string
): Promise<Map<string, number>> {
  const [supplyRewardPoolsData, borrowRewardPoolsData] = await Promise.all([
    getRewardPoolsData(client, getSupplyRewardsTransactionBlock(owner), owner),
    getRewardPoolsData(client, getBorrowRewardsTransactionBlock(owner), owner),
  ]);

  const rewards: Map<string, number> = new Map();

  const browseRewardPoolData = (e: { pools: Pool[] }) => {
    e.pools.forEach((pool) => {
      const funds = pool.funds as keyof typeof rewardsFunds;
      const { coinType } = rewardsFunds[funds];
      const aggAmount = rewards.get(coinType) || 0;
      rewards.set(
        coinType,
        aggAmount +
          new BigNumber(pool.available).shiftedBy(-1 * rateFactor).toNumber()
      );
    });
  };

  supplyRewardPoolsData.forEach(browseRewardPoolData);
  borrowRewardPoolsData.forEach(browseRewardPoolData);

  return rewards;
}
