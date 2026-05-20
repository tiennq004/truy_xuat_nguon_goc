// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PharmaTrace {
    struct Material {
        string dataHash;
        address owner;
        bool exists;
    }

    struct Drug {
        string dataHash;
        address owner;
        string lastStatus;
        bool exists;
    }

    mapping(string => Material) private materials;
    mapping(string => Drug) private drugs;

    event MaterialRegistered(string indexed materialId, string dataHash, address owner);
    event DrugRegistered(string indexed serial, string dataHash, address owner);
    event DrugTransferred(string indexed serial, address from, address to, string status);

    function registerMaterial(string memory materialId, string memory hashHex, string memory) external {
        require(!materials[materialId].exists, "Material already exists");
        materials[materialId] = Material({dataHash: hashHex, owner: msg.sender, exists: true});
        emit MaterialRegistered(materialId, hashHex, msg.sender);
    }

    function getMaterialHash(string memory materialId) external view returns (string memory) {
        require(materials[materialId].exists, "Material not found");
        return materials[materialId].dataHash;
    }

    function registerDrug(string memory serial, string memory hashHex, string memory) external {
        require(!drugs[serial].exists, "Drug already exists");
        drugs[serial] = Drug({dataHash: hashHex, owner: msg.sender, lastStatus: "Created", exists: true});
        emit DrugRegistered(serial, hashHex, msg.sender);
    }

    function getDrugHash(string memory serial) external view returns (string memory) {
        require(drugs[serial].exists, "Drug not found");
        return drugs[serial].dataHash;
    }

    function transferDrug(string memory serial, string memory toAsString, string memory status) external {
        require(drugs[serial].exists, "Drug not found");
        require(drugs[serial].owner == msg.sender, "Only current owner can transfer");
        address to = _parseAddress(toAsString);
        drugs[serial].owner = to;
        drugs[serial].lastStatus = status;
        emit DrugTransferred(serial, msg.sender, to, status);
    }

    function getDrugOwner(string memory serial) external view returns (address) {
        require(drugs[serial].exists, "Drug not found");
        return drugs[serial].owner;
    }

    function _fromHexChar(uint8 c) private pure returns (uint8) {
        if (bytes1(c) >= bytes1("0") && bytes1(c) <= bytes1("9")) return c - uint8(bytes1("0"));
        if (bytes1(c) >= bytes1("a") && bytes1(c) <= bytes1("f")) return 10 + c - uint8(bytes1("a"));
        if (bytes1(c) >= bytes1("A") && bytes1(c) <= bytes1("F")) return 10 + c - uint8(bytes1("A"));
        revert("Invalid hex character");
    }

    function _parseAddress(string memory a) private pure returns (address) {
        bytes memory tmp = bytes(a);
        require(tmp.length == 42, "Invalid address format");
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint256 i = 2; i < 42; i += 2) {
            iaddr *= 256;
            b1 = uint160(_fromHexChar(uint8(tmp[i])));
            b2 = uint160(_fromHexChar(uint8(tmp[i + 1])));
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }
}
