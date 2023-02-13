// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;

// Interface of Main contract to call from Session contract
contract IMain {
    /**
     * @dev Add a Session Contract address into Main Contract. Use to link Session with Main.
     * @param _session The address of session.
     */
    function addSession(address _session) public {}

    /**
     * @dev Update nSessions and deviation of participant in Main Contract when close session.
     * @param _participant Address of participant.
     * @param _deviation Deviation of participant in session.
     */
    function updateParticipant(address _participant, uint256 _deviation)
        public
    {}

    /**
     * @dev Get deviation of participant in Main Contract.
     * @param _participant Address of participant.
     */
    function getDeviation(address _participant) public view returns (uint256) {}

    /**
     * @dev Get account of participant.
     * @param _participant Address of participant.
     */
    function getAccount(address _participant) public view returns (address) {}

    /**
     * @dev Get address of admin.
     */
    function getAdmin() public view returns (address) {}
}

contract Session {
    // Structure to hold details of participant in session
    struct Participant {
        address account; // Account of participant
        uint256 price; // Price product of participant
        uint256 deviation; // Deviation of participant
    }

    // Enum state of session
    enum State {
        START,
        STOP,
        PRICING,
        CLOSE
    }

    address public mainContract; // Variable to hold Main Contract Address when create new Session Contract
    IMain MainContract; // Variable to hold Main Contract instance to call functions from Main

    address admin; // Admin create Main Contract
    string public name; // Name of product
    string public description; // Description of product
    string public image; // A link image of product
    address[] public iParticipants; // List address of participants join session
    mapping(address => Participant) public participants; // List info of participants
    uint256 public proposedPrice; // Proposed Price of product
    uint256 public finalPrice; // Final Price of product
    State public status; // State of session

    /**
     * @dev Check state of session.
     * @param expected_stats Address of participant.
     */
    modifier instate(State expected_stats) {
        require(status == expected_stats);
        _;
    }

    /**
     * @dev Check only admin can call function.
     */
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    /**
     * @dev Check just participant registered can call function.
     */
    modifier onlyParticipant() {
        address addr = MainContract.getAccount(msg.sender);
        require(addr != address(0));
        _;
    }

    /**
     * @dev constructor.
     * @param _name Name of product.
     * @param _description Description of product.
     * @param _image Link image of product.
     */
    constructor(
        address _mainContract,
        string memory _name,
        string memory _description,
        string memory _image
    ) {
        // Get Main Contract instance
        mainContract = _mainContract;
        MainContract = IMain(_mainContract);

        // Get admin from Main Contract
        admin = MainContract.getAdmin();
        require(msg.sender == admin);

        // Set info product and state of session
        name = _name;
        description = _description;
        image = _image;
        status = State.START;

        // Call Main Contract function to link current contract.
        MainContract.addSession(address(this));
    }

    /**
     * @dev Change state of session to start. After that participant can pricing.
     */
    function startSession() public onlyAdmin {
        require(status == State.START || status == State.STOP);
        status = State.PRICING;
    }

    /**
     * @dev Change state of session to stop. After that participant can not pricing , but admin can start session again.
     */
    function stopSession() public onlyAdmin instate(State.PRICING) {
        status = State.STOP;
    }

    /**
     * @dev Participant pricing product in session.
     * @param _price Prire of product from participant.
     */
    function pricingSession(uint256 _price)
        public
        onlyParticipant
        instate(State.PRICING)
    {
        require(_price > 0); // Price of product > 0
        if (participants[msg.sender].account == address(0)) {
            // First time participant join session
            participants[msg.sender].account = msg.sender;
            participants[msg.sender].price = _price;
            iParticipants.push(msg.sender);
        } else {
            participants[msg.sender].price = _price;
        }
    }

    /**
     * @dev Change state of session to close. After that caculate proposed price of product,
     * Caculate deviaton of participants in session,
     * Update nSessions and deviation of participant in Main Contract.
     * When closed session participant can not pricing and admin can not start session again.
     * @param _finalprice Final prire of product from admin.
     */
    function closeSession(uint256 _finalprice) public onlyAdmin {
        require(status == State.PRICING || status == State.STOP);
        require(_finalprice > 0);
        finalPrice = _finalprice;
        status = State.CLOSE;
        setProposedPrice(); // Caculate proposed price of product.
        setDeviations(); // Caculate deviaton of participants in session.
        updateParticipants(); // Update nSessions and deviation of participants in Main Contract.
    }

    /**
     * @dev Caculate proposed price of product.
     */
    function setProposedPrice() private {
        if (iParticipants.length == 0) {
            // When session don't have any participant join.
            proposedPrice = finalPrice;
        } else {
            uint256 valuePDs = sumPDs();
            uint256 valueDs = sumDeviations();
            proposedPrice = valuePDs / (100 * iParticipants.length - valueDs);
        }
    }

    /**
     * @dev Caculate deviaton of participants in session.
     */
    function setDeviations() private {
        address addr;
        uint256 participantPrice;
        for (uint256 i = 0; i < iParticipants.length; i++) {
            addr = iParticipants[i];
            participantPrice = participants[addr].price;
            if (finalPrice >= participantPrice) {
                participants[addr].deviation = methodD(
                    finalPrice,
                    participantPrice,
                    finalPrice
                );
            } else {
                participants[addr].deviation = methodD(
                    participantPrice,
                    finalPrice,
                    finalPrice
                );
            }
        }
    }

    /**
     * @dev Update nSessions and deviation of participant in Main Contract.
     */
    function updateParticipants() private {
        address addr;
        uint256 newDeviation;
        for (uint256 i = 0; i < iParticipants.length; i++) {
            addr = iParticipants[i];
            newDeviation = participants[addr].deviation;
            MainContract.updateParticipant(addr, newDeviation);
        }
    }

    function sumDeviations() private view returns (uint256) {
        uint256 sum = 0;
        address addrParticipant;
        for (uint256 i = 0; i < iParticipants.length; i++) {
            addrParticipant = iParticipants[i];
            sum += MainContract.getDeviation(addrParticipant);
        }
        return sum;
    }

    function methodPD(uint256 _A, uint256 _B) private pure returns (uint256) {
        return _A * (100 - _B);
    }

    function sumPDs() private view returns (uint256) {
        uint256 sum = 0;
        address addr;
        uint256 priceI;
        uint256 deviationI;

        for (uint256 i = 0; i < iParticipants.length; i++) {
            addr = iParticipants[i];
            priceI = participants[addr].price;
            deviationI = MainContract.getDeviation(addr);
            sum += methodPD(priceI, deviationI);
        }
        return sum;
    }

    function methodD(
        uint256 _A,
        uint256 _B,
        uint256 _C
    ) private pure returns (uint256) {
        return ((_A - _B) * 100) / _C;
    }
}
