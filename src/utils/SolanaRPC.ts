import { Metaplex } from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";

export const getTokenMetadata = async (mintAddress: string): Promise<{ 
    name: string, 
    ticker: string, 
    address: string, 
    logoUrl: string 
} | null> => {
  try {
    // Initialize Solana connection
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    // Initialize Metaplex instance
    const metaplex = Metaplex.make(connection);

    // Convert mint address to PublicKey
    const mintPublicKey = new PublicKey(mintAddress);

    // Fetch the NFT metadata using Metaplex
    const nft:any = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
    const { name, symbol, image } = nft.json;


    return { 
        name: name, 
        ticker: symbol, 
        address: mintAddress, 
        logoUrl: image 
    };

  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return null;
  }
};