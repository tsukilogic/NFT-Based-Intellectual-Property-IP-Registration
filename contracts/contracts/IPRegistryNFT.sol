// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract IPRegistryNFT is ERC721 {
    struct Record {
        bytes32 commitment;   // later: Poseidon(workHash, metaRoot, cipherHash, secret)
        string metaURI;       // later: ipfs://... encrypted metadata
        bytes32 cipherHash;   // hash of encrypted metadata blob (integrity)
        uint64 registeredAt;  // timestamp snapshot
    }

    uint256 public nextId = 1;

    mapping(uint256 => Record) public records;

    event Registered(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 indexed commitment,
        string metaURI,
        bytes32 cipherHash
    );

    constructor() ERC721("Private IP Registration", "PIPR") {}

    function register(bytes32 commitment, string calldata metaURI, bytes32 cipherHash)
        external
        returns (uint256 tokenId)
    {
        require(commitment != bytes32(0), "empty commitment");

        tokenId = nextId++;
        _safeMint(msg.sender, tokenId);

        records[tokenId] = Record({
            commitment: commitment,
            metaURI: metaURI,
            cipherHash: cipherHash,
            registeredAt: uint64(block.timestamp)
        });

        emit Registered(tokenId, msg.sender, commitment, metaURI, cipherHash);
    }
}
