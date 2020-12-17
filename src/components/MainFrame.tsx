import React, { useCallback, useContext, useEffect, useState } from "react";
import { Box, Button, Typography } from "@material-ui/core";
import { ethers } from "ethers";

import ContractsContext from "../contexts/Contracts";
import frame from "../public/img/frame.png";
import usePoller from "../hooks/Poller";

type Data = {
  address: string;
  order: number;
};

type Prize = {
  nft: string;
  tokenId: number;
  iWasStolenFrom: number;
};

const Table = () => {
  const { whiteElephant } = useContext(ContractsContext);
  const [data, setData] = useState<Data[]>([]);
  const [currTurn, setCurrTurn] = useState<number>(-1);

  const handleData = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;

    const totalNumPlayers = await contract.numberOfPlayers();

    const allPlayers: Data[] = [];
    for (let i = 0; i < totalNumPlayers; i++) {
      const player = await contract.getPlayerNumber(i);
      allPlayers.push({ address: player, order: i + 1 });
    }

    setData(allPlayers);
  }, [whiteElephant]);

  const handleTurn = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;

    const __currTurn = await contract.currNftToUnwrap();
    let _currTurn = -1;
    try {
      _currTurn = Number(__currTurn);
    } catch (err) {
      console.warn("could not get my order number");
    }

    setCurrTurn(_currTurn);
  }, [whiteElephant]);

  usePoller(handleData, 10000);
  usePoller(handleTurn, 10000);

  if (data.length < 1) return <></>;

  return (
    <table style={{ margin: "auto" }}>
      <thead>
        <tr>
          <th>Address</th>
          <th>Turn</th>
        </tr>
      </thead>
      <tbody>
        {data &&
          data.map((d) => (
            <tr
              key={`${d.address}::${d.order}`}
              style={{ background: currTurn === d.order ? "green" : "" }}
            >
              <td>{d.address}</td>
              <td>{d.order}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

const MainFrame: React.FC = () => {
  const { whiteElephant } = useContext(ContractsContext);
  const [stolen, setStolen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [myPrize, setMyPrize] = useState<Prize>();

  const wasStolenFrom = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;
    const _wasStolenFrom = await contract.myStolenFrom();
    const _nft = await contract.myNftAddress();
    setStolen(_nft === ethers.constants.AddressZero && _wasStolenFrom);
  }, [whiteElephant]);

  const unwrap = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;
    try {
      await contract.unwrap();
    } catch (err) {
      setError(err.data.message);
    }
  }, [whiteElephant]);

  const handlePrize = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;

    const nftAddress = await contract.myNftAddress();
    if (!nftAddress || ethers.constants.AddressZero === nftAddress) return;
    let tokenId = Number(await contract.myTokenId());
    let iWasStolenFrom = await contract.myStolenFrom();

    const _prize = {
      nft: nftAddress,
      tokenId,
      iWasStolenFrom,
    };

    setMyPrize(_prize);
  }, [whiteElephant]);

  usePoller(handlePrize, 20000);

  useEffect(() => {
    wasStolenFrom();
  }, [wasStolenFrom]);

  return (
    <Box>
      <Box style={{ marginBottom: "4em" }}>
        <Typography variant="h2">Thy Prize</Typography>
      </Box>
      <Box>
        <img src={frame} alt="painting frame" />
      </Box>
      {myPrize && (
        <Box style={{ marginTop: "2em" }}>
          <Typography>NFT Address: {myPrize.nft}</Typography>
          <Typography>
            Token id:{" "}
            <a
              href={`https://etherscan.io/token/${myPrize.nft}?a=${myPrize.tokenId}`}
            >
              {myPrize.tokenId}
            </a>
          </Typography>
        </Box>
      )}
      <Box style={{ marginTop: "2em" }}>
        {error && (
          <Typography style={{ fontWeight: "bold", color: "red" }}>
            {error}
          </Typography>
        )}
        <Box style={{ marginTop: "2em" }}>
          {!stolen && !myPrize && (
            <Button variant="outlined" onClick={unwrap}>
              Unwrap
            </Button>
          )}
          {stolen && (
            <Box>
              <Typography>Oh oh, someone naughty stole from you</Typography>
              <Typography>Go ahead, unwrap or steal</Typography>
              <Typography>Now, noone will be able to steal from you</Typography>

              <Button variant="outlined" onClick={unwrap}>
                Unwrap again...
              </Button>
            </Box>
          )}
        </Box>
      </Box>
      <Box style={{ marginTop: "4em", textAlign: "center" }}>
        <Typography variant="h6" style={{ fontWeight: "bold" }}>
          There shall-eth be order-eth
        </Typography>
        <Box style={{ margin: "2em" }}>
          <Table />
        </Box>
      </Box>
    </Box>
  );
};

export default MainFrame;
