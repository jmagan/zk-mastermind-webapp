import { useGames } from "@/hooks/use-games";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import { Table } from "flowbite-react";
import React from "react";
import GameList from "./game-list";

export default function ActiveGameTable() {
  const { activeGames } = useGames();
  const { hydraWalletAddress } = useHydraWallet();
  return (
    <>
      {!hydraWalletAddress && <p>Connect to hydra</p>}
      {hydraWalletAddress && (
        <div>
          <GameList
            games={activeGames?.filter(
              (game) =>
                (game.codeMaster === hydraWalletAddress ||
                  game.codeBreaker === hydraWalletAddress) &&
                game.state !== "FINISHED"
            )}
          />
          <p className="prose dark:prose-invert">Games waiting an openent:</p>
          <GameList
            games={activeGames?.filter(
              (game) =>
                game.state === "CREATED" &&
                game.codeMaster !== hydraWalletAddress
            )}
          />
        </div>
      )}
    </>
  );
}
