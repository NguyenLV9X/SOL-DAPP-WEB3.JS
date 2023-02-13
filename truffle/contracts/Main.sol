// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;

contract Main {
    // Structure to hold details of participant in Main Contract
    struct Participant {
        address account; // Account of participant
        string fullname; // Name of participant
        string email; // Mail of participant
        uint256 nSessions; // Number sessions. Participant joined
        uint256 deviation; // Deviation of participant in all sessions
    }

    address public admin; // Admin create Main Contract
    uint256 public nParticipants; // Total participants registered
    address[] public iParticipants; // List address participants
    mapping(address => Participant) public participants; // List info of participants
    uint256 public nSessions; // Total sessions created
    address[] public sessions; // List address sessions

    /**
     * @dev constructor.
     */
    constructor() {
        admin = msg.sender; // Set admin
    }

    /**
     * @dev Add a Session Contract address into Main Contract. Use to link Session with Main.
     * @param _session The address of session.
     */
    function addSession(address _session) public {
        require(tx.origin == admin); // Only admin add session
        sessions.push(_session);
        nSessions = sessions.length;
    }

    /**
     * @dev Register a participant.
     * @param _fullname Name of participant.
     * @param _email Mail of participant.
     */
    function register(string memory _fullname, string memory _email) public {
        require(msg.sender != admin); // Only participant can register
        require(participants[msg.sender].account == address(0)); // Check participant registered
        participants[msg.sender].account = msg.sender;
        participants[msg.sender].fullname = _fullname;
        participants[msg.sender].email = _email;
        iParticipants.push(msg.sender);
        nParticipants = iParticipants.length;
    }

    /**
     * @dev Update nSessions and deviation of participant in Main Contract when close session.
     * @param _participant Address of participant.
     * @param _deviation Deviation of participant in session.
     */
    function updateParticipant(address _participant, uint256 _deviation)
        public
    {
        require(tx.origin == admin); // Only admin can update
        uint256 oldDeviation = participants[_participant].deviation;
        uint256 valueNSessions = participants[_participant].nSessions;

        participants[_participant].deviation = methodD(
            oldDeviation,
            _deviation,
            valueNSessions
        );

        participants[_participant].nSessions++;
    }

    /**
     * @dev Get deviation of participant in Main Contract.
     * @param _participant Address of participant.
     */
    function getDeviation(address _participant) public view returns (uint256) {
        return participants[_participant].deviation;
    }

    /**
     * @dev Get account of participant.
     * @param _participant Address of participant.
     */
    function getAccount(address _participant) public view returns (address) {
        return participants[_participant].account;
    }

    /**
     * @dev Get address of admin.
     */
    function getAdmin() public view returns (address) {
        return admin;
    }

    function methodD(
        uint256 _A,
        uint256 _B,
        uint256 _C
    ) private pure returns (uint256) {
        return (_A * _C + _B) / (_C + 1);
    }
}
