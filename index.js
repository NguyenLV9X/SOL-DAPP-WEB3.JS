import { app, h } from 'hyperapp';
import { Link, Route, location } from '@hyperapp/router';
import { Products } from './pages/products';
import { Sidebar } from './pages/sidebar';
import { Participants } from './pages/participants';
import { config } from './config';
import { promisify } from 'util';
import './css/vendor/bootstrap.css';
import './css/vendor/coreui.css';
import './css/index.css';

const Fragment = (props, children) => children;

const Web3 = require('web3');
let web3js;

if (window.ethereum) {
  // Use MetaMask's provider
  web3js = new Web3(window.ethereum);
  // Get permission to access accounts
  window.ethereum.enable(); 
  // Detect Metamask account change
  window.ethereum.on('accountsChanged', function (accounts) {
    window.location.reload();
  });
} else {
  // Fallback
  web3js = new Web3(
    new Web3.providers.HttpProvider("http://127.0.0.1:7545"),
  );
}

import Main from './contracts/Main.json';
import Session from './contracts/Session.json';

const mainContract = new web3js.eth.Contract(Main.abi, config.mainContract);

var state = {
  count: 1,
  location: location.state,
  products: [],
  dapp: {},
  balance: 0,
  account: 0,
  admin: null,
  profile: null,
  fullname: '',
  email: ''.replace,
  newProduct: {},
  sessions: [],
  currentProductIndex: 0
};

// Functions of Main Contract
const contractFunctions = {
  // Get list of accounts
  getAccounts: promisify(web3js.eth.getAccounts),

  // Get the balance of an address
  getBalance: promisify(web3js.eth.getBalance),

  // Get Admin address of Main contract
  getAdmin: mainContract.methods.admin().call,

  // Get participant by address
  participants: address => mainContract.methods.participants(address).call,

  // Get number of participants
  nParticipants: mainContract.methods.nParticipants().call,

  // Get address of participant by index (use to loop through the list of participants) 
  iParticipants: index => mainContract.methods.iParticipants(index).call,

  // Register new participant
  register: (fullname, email) =>
    mainContract.methods.register(fullname, email).send,
  
  // Get number of sessions  
  nSessions: mainContract.methods.nSessions().call,

  // Get address of session by index (use to loop through the list of sessions) 
  sessions: index => mainContract.methods.sessions(index).call
};

const actions = {
  // Input profile
  inputProfile: ({ field, value }) => state => {
    let profile = state.profile || {};
    profile[field] = value;
    return {
      ...state,
      profile
    };
  },

  // Input new product
  inputNewProduct: ({ field, value }) => state => {
    let newProduct = state.newProduct || {};
    newProduct[field] = value;
    return {
      ...state,
      newProduct
    };
  },

  // Create product
  createProduct: () => async (state, actions) => {
    let contract = new web3js.eth.Contract(Session.abi, {
      data: Session.bytecode
    });

    // Create a session for a product
    await contract
      .deploy({
        arguments: [
          config.mainContract,          // Address of main contract
          state.newProduct.name,        // Name of product
          state.newProduct.description, // Description of product
          state.newProduct.image        // A link image of product
        ]
      })
      .send({ from: state.account });

    actions.getSessions();
  },

  // Select product
  selectProduct: i => state => {
    return {
      ...state,
      currentProductIndex: i
    };
  },

  // Call action for session
  sessionFn: ({ action, data }) => async (state, actions) => {
    // Get address session contract by index
    let sessionContract = state.sessions[state.currentProductIndex].contract;
    // Get status of session
    let status = await sessionContract.methods.status().call();

    // Selete action for session
    switch (action) {
      // Start session
      case 'start':
        if(status == 0 || status == 1) {
          await sessionContract.methods.startSession().send({ from:state.account });
          actions.getSessions();         
        } else if(status == 2) {
          alert("Session Started!!!");
        } else if(status == 3) {
          alert("Session Closed!!!");
        }
        break;

      // Stop session
      case 'stop':
        if(status == 0) {
          alert("Session not Start!!!");
        } else if(status == 1) {
          alert("Session Stopped!!!");
        } else if( status == 2) {
          await sessionContract.methods.stopSession().send({ from:state.account });
          actions.getSessions(); 
        }else if(status == 3) {
          alert("Session Closed!!!");
        }
        break;

      // Pricing session
      case 'pricing':
        if(status == 0) {
          alert("Session not Start!!!");
        } else if(status == 1) {
          alert("Session Stopped!!!");
        } else if( status == 2) {
          let account = state.profile["account"]; // Account connect with Dapp

          // Check account register
          if(account == 0) {
            alert("Account not register!");
          } else {

            // Check Propose price > 0
            if(data == 0)
            {
              alert("Propose price > 0 !!!");
              break;
            }

            await sessionContract.methods.pricingSession(data).send({ from:state.account });
            alert("Success!");
          }

        } else if(status == 3) {
          alert("Session Closed!!!");
        }
        break;

      // Close session
      case 'close':
        if(status == 0) {
          alert("Session not Start!!!");
        } else if(status == 1 || status == 2) {

          // Check Price > 0
          if(data == 0)
            {
              alert("Price > 0 !!!");
              break;
            }

          await sessionContract.methods.closeSession(data).send({ from:state.account });
          actions.getSessions();
          actions.getParticipants(); 
        } else if(status == 3) {
          alert("Session Closed!!!");
        }
        break;
    }   
  },

  location: location.actions,

  // Get account connect with Dapp
  getAccount: () => async (state, actions) => {
    // Get list of accounts
    let accounts = await contractFunctions.getAccounts();
    // Get the balance of the address
    let balance = await contractFunctions.getBalance(accounts[0]);
    // Get address of admin create main contract
    let admin = await contractFunctions.getAdmin();
    // Get profile of an address
    let profile = await contractFunctions.participants(accounts[0])();
    
    actions.setAccount({
      account: accounts[0],
      balance,
      isAdmin: admin === accounts[0],
      profile
    });
  },

  // Set account
  setAccount: ({ account, balance, isAdmin, profile }) => state => {
    return {
      ...state,
      account: account,
      balance: balance,
      isAdmin: isAdmin,
      profile
    };
  },
  
  // Get participants from main contract
  getParticipants: () => async (state, actions) => {
    let participants = [];
    // Get number participants
    let nParticipants = await contractFunctions.nParticipants();

    for(let index = 0; index < nParticipants; index++) {
      // Get address of participants
      let address = await contractFunctions.iParticipants(index)();

      // check allowed show profile of participant
      if(state.isAdmin || address == state.account) {
          let profile = await contractFunctions.participants(address)();
          participants.push(profile);
      } 
    }

    actions.setParticipants(participants);
  },

  // Set participants
  setParticipants: participants => state => {
    return {
      ...state,
      participants: participants
    };
  },

  // Set Profile
  setProfile: profile => state => {
    return {
      ...state,
      profile: profile
    };
  },

  // Register participant
  register: () => async (state, actions) => {
    let name = state.profile["fullname"]; // Name of participant
    let email = state.profile["email"];   // Mail of participant

    // Register participant
    await contractFunctions.register(name,email)({ from:state.account });
    // Get participant by address
    const profile = await contractFunctions.participants(state.account)();
      
    actions.setProfile(profile);
    actions.getParticipants();
  },

  // Get Sessions
  getSessions: () => async (state, actions) => {
    // Get number sessions
    let nSession = await contractFunctions.nSessions();
    let sessions = [];

    for (let index = 0; index < nSession; index++) {
      // Get session address
      let session = await contractFunctions.sessions(index)();
      // Load the session contract on network
      let contract = new web3js.eth.Contract(Session.abi, session);
      // Get status session
      let tempStatus = await contract.methods.status().call();
  
      // Not show session
      if(!state.isAdmin && tempStatus != 2 && tempStatus != 3)
        continue;
      
      // Address session
      let id = session;
      // Name of product
      let name = await contract.methods.name().call();
      // Description of product
      let description = await contract.methods.description().call();
      // Proposed Price of product 
      let price = await contract.methods.proposedPrice().call();
      // A link image of product
      let image = await contract.methods.image().call();
      
      // Set status in front end
      let status;
      switch(tempStatus) {
        case '0':
          status = "START";
          break;
        case '1':
          status = "STOP";
          break;
        case '2':
          status = "PRICING";
          break;
        case '3':
          status = "CLOSE";
          break;
      }

      sessions.push({ id, name, description, price, contract, image, status });
    }

    actions.setSessions(sessions);
  },

  // Set sessions
  setSessions: sessions => state => {
    return {
      ...state,
      sessions: sessions
    };
  }
};

const view = (
  state,
  { getAccount, getParticipants, register, inputProfile, getSessions }
) => {
  return (
    <body
      class='app sidebar-show sidebar-fixed'
      oncreate={() => {
        getAccount().then(() => {
          getParticipants();
          getSessions();
        });  
      }}
    >
      <div class='app-body'>
        <Sidebar
          balance={state.balance}
          account={state.account}
          isAdmin={state.isAdmin}
          profile={state.profile}
          register={register}
          inputProfile={inputProfile}
        ></Sidebar>
        <main class='main d-flex p-3'>
          <div class='h-100  w-100'>
            <Route path='/products' render={Products}></Route>
            <Route path='/participants' render={Participants}></Route>
          </div>
        </main>
      </div>
    </body>
  );
};

const el = document.body;
const main = app(state, actions, view, el);
const unsubscribe = location.subscribe(main.location);
