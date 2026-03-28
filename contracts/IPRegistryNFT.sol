// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract IPRegistryNFT is ERC721URIStorage {
    uint256 private _nextTokenId = 1;

    struct IPRecord {
        bytes32 fileHash;
        uint256 registeredAt;
        address creator;
        string metadataURI;
    }

    mapping(uint256 => IPRecord) private _records;
    mapping(bytes32 => uint256) private _hashToTokenId;

    event IPRegistered(
        uint256 indexed tokenId,
        address indexed creator,
        bytes32 indexed fileHash,
        string metadataURI,
        uint256 registeredAt
    );

    constructor() ERC721("IP Registry NFT", "IPNFT") {}

    function registerIP(bytes32 fileHash, string calldata metadataURI)
        external
        returns (uint256 tokenId)
    {
        require(fileHash != bytes32(0), "Invalid hash");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");
        require(_hashToTokenId[fileHash] == 0, "Hash already registered");

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        _records[tokenId] = IPRecord(
            fileHash,
            block.timestamp,
            msg.sender,
            metadataURI
        );

        _hashToTokenId[fileHash] = tokenId;

        emit IPRegistered(
            tokenId,
            msg.sender,
            fileHash,
            metadataURI,
            block.timestamp
        );
    }

    function verifyIP(bytes32 fileHash)
        external
        view
        returns (
            bool exists,
            uint256 tokenId,
            address owner,
            address creator,
            uint256 registeredAt,
            string memory metadataURI
        )
    {
        tokenId = _hashToTokenId[fileHash];

        if (tokenId == 0) {
            return (false, 0, address(0), address(0), 0, "");
        }

        IPRecord memory r = _records[tokenId];

        return (
            true,
            tokenId,
            ownerOf(tokenId),
            r.creator,
            r.registeredAt,
            r.metadataURI
        );
    }
}