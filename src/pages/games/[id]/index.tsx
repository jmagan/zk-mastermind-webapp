import ClaimButton from "@/components/game/claim-button";
import ClueForm from "@/components/game/clue-form";
import GuessButton from "@/components/game/guess-button";
import Layout from "@/components/layout";
import Board from "@/components/mastermind/board";
import useGame from "@/hooks/use-game";
import useGameTransaction from "@/hooks/use-game-transaction";
import useHydra from "@/hooks/use-hydra";
import useHydraWallet from "@/hooks/use-hydra-wallet";
import useTransactionLifecycle from "@/hooks/use-transaction-lifecyle";
import {
  addUTxOInputs,
  toValue,
  txBuilderConfig,
  unixToSlot,
} from "@/services/blockchain-utils";
import { plutusScript } from "@/services/mastermind";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { keepRelevant, resolvePaymentKeyHash } from "@meshsdk/core";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/router";
import { ReactElement, useEffect } from "react";

export default function Game() {
  const router = useRouter();
  const { hydraWalletAddress, hydraWallet, hydraUtxos } = useHydraWallet();
  const { findHydraUtxo } = useHydra();
  const { game, priorGameRow, currentGameRow } = useGame({
    id: Number(router.query.id),
  });
  const { end } = useGameTransaction();
  const { waitTransactionConfirmation } = useTransactionLifecycle();

  useEffect(() => {
    const endGame = async () => {
      let winnerAddress = "";

      if (
        game &&
        priorGameRow &&
        game.codeMasterAddress === hydraWalletAddress &&
        game.currentTurn === 10 &&
        priorGameRow.blackPegs < 4
      ) {
        winnerAddress = game.codeMaster;
      } else if (
        game &&
        priorGameRow &&
        game.codeBreakerAddress === hydraWalletAddress &&
        priorGameRow.blackPegs === 4
      ) {
        winnerAddress = game.codeBreakerAddress;
      }

      if (
        !winnerAddress ||
        (hydraWalletAddress !== winnerAddress && game?.state !== "STARTED")
      )
        return;

      if (
        !hydraWallet ||
        !hydraUtxos ||
        !game ||
        !game.rows ||
        !hydraWalletAddress
      )
        return;
      try {
        await setTimeout(() => {}, 5000);

        try {
          const { txHash } = await end({ game, priorGameRow });

          await waitTransactionConfirmation(txHash);

          game.state = "FINISHED";
          const response = await axios.patch(
            process.env.NEXT_PUBLIC_HYDRA_BACKEND + "/games",
            game
          );
          console.log(response.data);

          router.push("/lobby");
        } catch (e) {
          if (e instanceof AxiosError) {
            console.log(e.response?.data);
          }
          console.log(e);
        }
      } catch (e) {
        console.log(e);
      }
    };
    endGame();
  }, [
    currentGameRow,
    end,
    findHydraUtxo,
    game,
    game?.rows,
    hydraUtxos,
    hydraWallet,
    hydraWalletAddress,
    priorGameRow,
    router,
  ]);

  return (
    <div className="flex flex-col max-w-4xl mx-auto">
      <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8 mb-8">
        <div className="prose dark:prose-invert text-center max-w-2xl mx-auto">
          🚨IMPORTANT!!!🚨 If you like what we are doing!! Please consider
          support us in Catalyst: 🚦
          <a href="https://cardano.ideascale.com/c/idea/113249" target="_blank">
            Semaphore protocol
          </a>
          🚦
        </div>
      </div>
      <div className="shadow border-2 ring-gray-200 dark:ring-gray-700 rounded-lg w-full flex flex-col backdrop-blur bg-gray-100 dark:bg-gray-800 px-10 py-8">
        <div className="flex flex-row gap-8 ">
          <div className="flex flex-col prose dark:prose-invert">
            <h2 className="text-center mb-2">Board</h2>
            <p className="text-center my-2">
              {game?.codeBreakerAddress && (
                <>
                  {game.codeMaster.nickname} 🆚 {game.codeBreaker.nickname}
                </>
              )}
            </p>
            <p className="text-xs">TIP: click to change the color</p>
            {game?.rows && <Board id={game.id} readonly={false} />}
          </div>
          <div className="flex flex-col flex-grow prose dark:prose-invert text-sm">
            <h2 className="text-center ">Smart contract control</h2>
            <p>
              Modulo-P brings you the first-ever game to experience the speed of
              Hydra and ZK proofs on Cardano.
            </p>
            {game &&
              ((hydraWalletAddress === game.codeBreakerAddress &&
                game.state === "STARTED") ||
                (game.state === "CREATED" &&
                  game.codeMasterAddress !== hydraWalletAddress)) && (
                <div>
                  <p>
                    You are the code breaker 🥷. Select a sequence and send your
                    guess to the code master. Wait until the code master give
                    you back a clue. This clue is shield by a ZK Proof and it
                    can&apos;t be incorrect.
                  </p>
                  <GuessButton
                    game={game}
                    setInfoMessage={(message) =>
                      console.log("guess button", message)
                    }
                  />
                </div>
              )}
            {game &&
              ["STARTED", "CREATED"].includes(game.state) &&
              hydraWalletAddress === game.codeMasterAddress && (
                <div>
                  <p>
                    You are the code master 🧙🏻‍♀️. Wait for the code breaker. When
                    you recieve a guess, remember to give back the correct clue.
                    Else you won&apos;t be able to continue the game.{" "}
                  </p>
                  <ClueForm id={game.id} />
                </div>
              )}
            {game && game.state == "STARTED" && currentGameRow && (
              <>
                <p>
                  If your opponent doesn&apos;t respond within a time limit, you
                  will have the right to claim the game.
                </p>
                <ClaimButton game={game} currentGameRow={currentGameRow} />
              </>
            )}
            {game && game.state === "FINISHED" && <p>The game is finished.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
