const Main = artifacts.require("Main");
const Session = artifacts.require('Session');

/*
 * Test Cases FunixPricingChain
 */
contract("Main", function(accounts) {

  let instance;

  before(async function() {
    instance = await Main.deployed();
  });

  /**
   * Test Cases For Main Contract
   */
  describe("Main Contract",function() {

    // Check main deployed
    it("Check main deployed",function() {
      assert.isTrue(instance !== undefined);
    });

    // Check register information participant
    it("Check register information participant",async function() {
      await instance.register("user1","user1@test.com",{ from : accounts[1] });
      let user1 = await instance.participants(accounts[1]);
      let nParticipants = await instance.nParticipants();
      assert.equal(nParticipants,1);
      assert.equal(user1[1],"user1");
      assert.equal(user1[2],"user1@test.com");
    });

    // Check duplicate information participant
    it("Check duplicate information participant", async function() {
      try{
        await instance.register("user2","user2@test.com",{ from : accounts[1] });
        assert.fail("Register should have thrown an error");
      }catch(err){
        assert(true);
      }   
    });

    // Check update participant
    it("Check update participant",async function() {
      await instance.updateParticipant(accounts[1], 10,{ from : accounts[0] });
      let user2 = await instance.participants(accounts[1]);
      assert.equal(user2[3], 1);
      assert.equal(user2[4], 10);
    });

    // Check only admin update participant
    it("Check only admin update participant",async function() {
      try{
        await instance.updateParticipant(accounts[1], 20,{ from : accounts[1] });
        assert.fail("updateParticipant should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });
    
    // Check get participant's deviation
    it("Check get participant's deviation",async function() {
      let deviation = await instance.getDeviation(accounts[1], { from : accounts[0] });
      assert.equal(deviation, 10);
    });

    // Check get participant's account
    it("Check get participant's account",async function() {
      let account = await instance.getAccount(accounts[1], { from : accounts[0] });
      assert.equal(account, accounts[1]);
    });

    // Check get admin's address
    it("Check get admin's address",async function() {
      let admin = await instance.getAdmin({ from : accounts[0] });
      assert.equal(admin, accounts[0]);
    });

    // Check add a session
    it("Check add a session",async function() {
      await instance.addSession("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", { from : accounts[0] });
      let nSessions = await instance.nSessions();
      let sessions = await instance.sessions(0);
      assert.equal(nSessions, 1);
      assert.equal(sessions, "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
    });

    // Only admin add a session
    it("Only admin add a session",async function() {
      try{
        await instance.addSession("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", { from : accounts[1] });
        assert.fail("addSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });
    
  });

  /**
   * Test Cases For Main Contract And Session Contract
   */
  describe("Main Contract and Session Contract",function() {
    let session;

    // Check add a session
    it("Check add a session",async function() {
      session = await Session.new(instance.address, "Tablet", "Tablet", "https://ipfs.io/ipfs/QmewTNKfCk7yjrVPsWoCpmidKn5x7JV7Lmv6K68BDtqQuP", { from: accounts[0] });

      let nSessions = await instance.nSessions();
      let sessions = await instance.sessions(1);
      let name = await session.name();
      let description = await session.description();
      let image = await session.image();

      assert.isTrue(session !== undefined);
      assert.equal(nSessions, 2);
      assert.equal(sessions, session.address);
      assert.equal(name, "Tablet");
      assert.equal(description, "Tablet");
      assert.equal(image, "https://ipfs.io/ipfs/QmewTNKfCk7yjrVPsWoCpmidKn5x7JV7Lmv6K68BDtqQuP");
    });

    // Only admin add a session
    it("Only admin add a session",async function() {
      try{
        await Session.new(instance.address, "Tablet2", "Tablet2", "https://ipfs.io/ipfs/QmewTNKfCk7yjrVPsWoCpmidKn5x7JV7Lmv6K68BDtqQuP", { from: accounts[1] });
        assert.fail("Constructor should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });
    
    // Only admin start a session
    it("Only admin start a session",async function() {
      try{
        await session.startSession({ from: accounts[1] });
        assert.fail("startSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check admin stop session when session not start
    it("Check admin stop session when session not start",async function() {
      try{
        await session.stopSession({ from: accounts[0] });
        assert.fail("stopSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check admin start a session
    it("Check admin start a session",async function() {
      await session.startSession({ from: accounts[0] });
      let status = await session.status();
      assert.equal(status, 2);
    });

    // Only admin stop a session
    it("Only admin stop a session",async function() {
      try{
        await session.stopSession({ from: accounts[1] });
        assert.fail("stopSession should have thrown an error");
      }catch(err){
        let status = await session.status();
        assert.equal(status, 2);
        assert(true);
      } 
    });
    
    // Check stop a session
    it("Check stop a session",async function() {
      await session.stopSession({ from: accounts[0] });
      let status = await session.status();
      assert.equal(status, 1);
    });

    // Check start a session again when stopped session
    it("Check start a session again when stopped session",async function() {
      let status = await session.status();
      assert.equal(status, 1);
      await session.startSession({ from: accounts[0] });
      status = await session.status();
      assert.equal(status, 2);
    });

    // Only participants pricing
    it("Only participants pricing",async function() {
      try{
        await session.pricingSession(123, { from: accounts[0] });
        assert.fail("pricingSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check price > 0 when pricing
    it("Check price > 0 when pricing",async function() {
      try{
        await session.pricingSession(0, { from: accounts[1] });
        assert.fail("pricingSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check participants pricing
    it("Check participants pricing",async function() {
      await session.pricingSession(123, { from: accounts[1] });
      let participant = await session.participants(accounts[1]);
      assert.equal(participant[1], 123);
    });

    // Check participants pricing when stopped session
    it("Check participants pricing when stopped session",async function() {

      await session.stopSession({ from: accounts[0] });
      let status = await session.status();
      assert.equal(status, 1);

      try{
        await session.pricingSession(321, { from: accounts[1] });
        assert.fail("pricingSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check participants pricing when start session again
    it("Check participants pricing when start session again",async function() {

      await session.startSession({ from: accounts[0] });
      let status = await session.status();
      assert.equal(status, 2);

      await session.pricingSession(424, { from: accounts[1] });
      let participant = await session.participants(accounts[1]);
      assert.equal(participant[1], 424);
    });

    // Only admin close a session
    it("Only admin close a session",async function() {
      try{
        await session.closeSession({ from: accounts[1] });
        assert.fail("closeSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check price > 0 when close a session
    it("Check price > 0 when close a session",async function() {
      try{
        await session.closeSession(0, { from: accounts[0] });
        assert.fail("closeSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check admin close a session
    it("Check admin close a session",async function() {

      await session.closeSession(500, { from: accounts[0] });
      let status = await session.status();
      assert.equal(status, 3);

      let finalPrice = await session.finalPrice();
      assert.equal(finalPrice, 500);

      let proposedPrice = await session.proposedPrice();
      assert.equal(proposedPrice, 424);

      let participants = await session.participants(accounts[1]);
      assert.equal(participants[2], 15);

      let user = await instance.participants(accounts[1]);
      assert.equal(user[3], 2);
      assert.equal(user[4], 12);
    });

    // Check admin start session again when closed session
    it("Check admin start session again when closed session",async function() {
      try{
        await session.startSession({ from: accounts[0] });
        assert.fail("startSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check admin close session again when closed session
    it("Check admin close session again when closed session",async function() {
      try{
        await session.closeSession({ from: accounts[0] });
        assert.fail("closeSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

    // Check admin stop session when closed session
    it("Check admin stop session when closed session",async function() {
      try{
        await session.stopSession({ from: accounts[0] });
        assert.fail("stopSession should have thrown an error");
      }catch(err){
        assert(true);
      } 
    });

  });
});
