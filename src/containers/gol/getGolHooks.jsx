import { useEffect, useState } from 'react';
import { fromBech32 } from '../../utils/utils';
import {
  getTxCosmos,
  getAmountATOM,
  getGraphQLQuery,
  getValidatorsInfo,
} from '../../utils/search/utils';
import { getEstimation } from '../../utils/fundingMath';
import { DISTRIBUTION, TAKEOFF, COSMOS } from '../../utils/config';
import {
  getRelevance,
  getLoad,
  getRewards,
  getDelegation,
  getLifetime,
  getTakeoff,
} from '../../utils/game-monitors';

const QueryAddress = (subject) =>
  `  query getRelevanceLeaderboard {
        relevance_leaderboard(
          where: {
            subject: { _eq: "${subject}" }
          }
        ) {
          subject
          share
        }
      }
  `;

const getQueryLifeTime = (consensusAddress) => `
query lifetimeRate {
  pre_commit_view(where: {consensus_pubkey: {_eq: "${consensusAddress}"}}) {
    precommits
  }
  pre_commit_aggregate {
    aggregate {
      count
    }
  }
}
`;

function useGetAtom(addressCyber) {
  const [estimation, setEstimation] = useState(0);

  useEffect(() => {
    const feachData = async () => {
      let estimationAll = 0;
      let addEstimation = 0;

      const dataTxs = await getTxCosmos();
      const addressCosmos = fromBech32(addressCyber, 'cosmos');
      if (dataTxs !== null) {
        if (dataTxs.total_count > dataTxs.count) {
          const allPage = Math.ceil(dataTxs.total_count / dataTxs.count);
          for (let index = 1; index < allPage; index++) {
            // eslint-disable-next-line no-await-in-loop
            const response = await getTxCosmos(index + 1);
            if (response !== null && Object.keys(response.txs).length > 0) {
              dataTxs.txs = [...dataTxs.txs, ...response.txs];
            }
          }
        }
      }
      if (dataTxs && Object.keys(dataTxs.txs).length > 0) {
        const dataTx = dataTxs.txs;
        for (let item = 0; item < dataTx.length; item += 1) {
          let temE = 0;
          const address = dataTx[item].tx.value.msg[0].value.from_address;
          const val =
            Number.parseInt(
              dataTx[item].tx.value.msg[0].value.amount[0].amount,
              10
            ) / COSMOS.DIVISOR_ATOM;
          temE = getEstimation(estimationAll, val);
          if (address === addressCosmos) {
            addEstimation += temE;
          }
          estimationAll += temE;
        }
      }
      setEstimation(addEstimation);
    };
    feachData();
  }, []);
  return { estimation };
}

function useGetGol(address) {
  const { estimation } = useGetAtom(address);
  const [validatorAddress, setValidatorAddress] = useState(null);
  const [consensusAddress, setConsensusAddress] = useState(null);
  const [gol, setGol] = useState({
    load: 0,
    relevance: 0,
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const feachData = async () => {
      const dataValidatorAddress = fromBech32(address, 'cybervaloper');
      const dataGetValidatorsInfo = await getValidatorsInfo(
        dataValidatorAddress
      );
      if (dataGetValidatorsInfo !== null) {
        setConsensusAddress(dataGetValidatorsInfo.consensus_pubkey);
        setValidatorAddress(dataValidatorAddress);
      }
    };
    feachData();
  }, [address]);

  useEffect(() => {
    const feachData = async () => {
      const responseDataQ = await getGraphQLQuery(QueryAddress(address));
      const prize = Math.floor(
        (DISTRIBUTION.relevance / TAKEOFF.ATOMsALL) * TAKEOFF.FINISH_AMOUNT
      );
      if (
        responseDataQ.relevance_leaderboard &&
        Object.keys(responseDataQ.relevance_leaderboard).length > 0
      ) {
        const shareData = responseDataQ.relevance_leaderboard[0].share;
        const cybAbsolute = shareData * prize;
        setTotal((stateTotal) => stateTotal + cybAbsolute);
        setGol((stateGol) => ({ ...stateGol, relevance: cybAbsolute }));
      }
    };
    feachData();
  }, [address]);

  useEffect(() => {
    const feachData = async () => {
      const prize = Math.floor(
        (DISTRIBUTION.load / TAKEOFF.ATOMsALL) * TAKEOFF.FINISH_AMOUNT
      );
      const data = await getLoad(address);
      if (data > 0 && prize > 0) {
        const cybAbsolute = data * prize;
        setTotal((stateTotal) => stateTotal + cybAbsolute);
        setGol((stateGol) => ({ ...stateGol, load: cybAbsolute }));
      }
    };
    feachData();
  }, [address]);

  useEffect(() => {
    const feachData = async () => {
      const prize = Math.floor(estimation * 10 ** 12);
      if (prize > 0) {
        setTotal((stateTotal) => stateTotal + prize);
      }
    };
    feachData();
  }, [estimation]);

  useEffect(() => {
    if (validatorAddress !== null) {
      const feachData = async () => {
        const prize = Math.floor(
          (DISTRIBUTION.delegation / TAKEOFF.ATOMsALL) * TAKEOFF.FINISH_AMOUNT
        );
        const data = await getDelegation(validatorAddress);
        if (data > 0 && prize > 0) {
          const cybAbsolute = data * prize;
          setTotal((stateTotal) => stateTotal + cybAbsolute);
        }
      };
      feachData();
    }
  }, [validatorAddress]);

  useEffect(() => {
    if (validatorAddress !== null) {
      const feachData = async () => {
        const data = await getRewards(validatorAddress);
        if (data > 0) {
          const cybAbsolute = data;
          setTotal((stateTotal) => stateTotal + cybAbsolute);
        }
      };
      feachData();
    }
  }, [validatorAddress]);

  useEffect(() => {
    if (consensusAddress !== null) {
      const feachData = async () => {
        const prize = Math.floor(
          (DISTRIBUTION.lifetime / TAKEOFF.ATOMsALL) * TAKEOFF.FINISH_AMOUNT
        );
        const dataLifeTime = await getGraphQLQuery(
          getQueryLifeTime(consensusAddress)
        );
        if (dataLifeTime !== null) {
          const data = await getLifetime({
            block: dataLifeTime.pre_commit_aggregate.aggregate.count,
            preCommit: dataLifeTime.pre_commit_view[0].precommits,
          });
          if (data > 0 && prize > 0) {
            const cybAbsolute = data * prize;
            setTotal((stateTotal) => stateTotal + cybAbsolute);
          }
        }
      };
      feachData();
    }
  }, [consensusAddress]);

  return total;
}

export default useGetGol;
