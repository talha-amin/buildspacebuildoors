import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";
import { initializeKeypair } from "./initializeKeypair";
import * as fs from "fs";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  toMetaplexFile,
} from "@metaplex-foundation/js";

import {
    DataV2,
    createCreateMetadataAccountV3Instruction,
  } from "@metaplex-foundation/mpl-token-metadata";

const TOKEN_NAME = "CASTLE";
const TOKEN_SYMBOL = "CST";
const TOKEN_DESCRIPTION = "A token for buildoors";
const TOKEN_IMAGE_NAME = "0.png"; // Replace unicorn.png with your image name
const TOKEN_IMAGE_PATH = `tokens/bld/assets/${TOKEN_IMAGE_NAME}`;

async function createBldToken(
    connection : web3.Connection,
    payer: web3.Keypair){
        // This will create a token with all the necessary inputs
    const tokenMint = await token.createMint(
        connection, // Connection
        payer, // Payer
        payer.publicKey, // Your wallet public key
        payer.publicKey, // Freeze authority
        2 // Decimals
    );
        const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(payer))
        .use(bundlrStorage({
            address:"https://devnet.bundlr.network",
            providerUrl: "https://api.devnet.solana.com",
            timeout: 60000
        }));

        
          // Read image file
    const imageBuffer = fs.readFileSync(TOKEN_IMAGE_PATH);
    const file = toMetaplexFile(imageBuffer, TOKEN_IMAGE_NAME);
    const imageUri = await metaplex.storage().upload(file);


     // Upload the rest of offchain metadata
     const { uri } = await metaplex
     .nfts()
     .uploadMetadata({
     name: TOKEN_NAME,
     description: TOKEN_DESCRIPTION,
     image: imageUri,
     });

     const metadataPda = metaplex.nfts().pdas().metadata({mint:tokenMint});
     const tokenMetadata = {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      uri: uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
  } as DataV2

  const instruction = createCreateMetadataAccountV3Instruction({
    metadata: metadataPda,
    mint: tokenMint,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey
},
    {
      createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null
      }
  })

  const transaction = new web3.Transaction()
  transaction.add(instruction)

  const transactionSignature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer]
  )
  
  fs.writeFileSync(
    "tokens/bld/cache.json",
    JSON.stringify({
      mint: tokenMint.toBase58(),
      imageUri: imageUri,
      metadataUri: uri,
      tokenMetadata: metadataPda.toBase58(),
      metadataTransaction: transactionSignature,
    })
  );
}

// The rest of your main function


async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"),"finalized");
  const payer = await initializeKeypair(connection);

  await createBldToken(connection, payer);
  }

  
  main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });