// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract IPRegistryNFT is ERC721URIStorage {
    uint256 private _nextTokenId = 1;

    struct IPRecord {
        uint256 tokenId;
        bytes32 fileHash;
        uint256 registeredAt;
        address creator;
        string metadataURI;
    }

    mapping(uint256 => IPRecord) private _records;
    mapping(bytes32 => uint256) private _hashToTokenId;
    mapping(address => uint256[]) private _creatorToTokenIds;

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

        _records[tokenId] = IPRecord({
            tokenId: tokenId,
            fileHash: fileHash,
            registeredAt: block.timestamp,
            creator: msg.sender,
            metadataURI: metadataURI
        });

        _hashToTokenId[fileHash] = tokenId;
        _creatorToTokenIds[msg.sender].push(tokenId);

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

    function getRecordByTokenId(uint256 tokenId)
        external
        view
        returns (
            bytes32 fileHash,
            uint256 registeredAt,
            address creator,
            address owner,
            string memory metadataURI
        )
    {
        // Safer existence check: avoids any OZ version ambiguity with _ownerOf
        require(tokenId > 0 && tokenId < _nextTokenId, "Token does not exist");

        IPRecord memory r = _records[tokenId];

        return (
            r.fileHash,
            r.registeredAt,
            r.creator,
            ownerOf(tokenId),
            r.metadataURI
        );
    }

    function getMyTokenIds(address user)
        external
        view
        returns (uint256[] memory)
    {
        return _creatorToTokenIds[user];
    }

    function getTokenIdByHash(bytes32 fileHash)
        external
        view
        returns (uint256)
    {
        return _hashToTokenId[fileHash];
    }

    function totalRegistered() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
