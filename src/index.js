import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// Calculate winner user by listing all possible winning cases
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return [lines[i], squares[a]];
    }
  }
  return null;
}

// Component for creating an individual square
function Square(props) {
  return (
    <button id={'sqr_' + props.id} className="square" onClick={props.onClick}>
      {props.value}
    </button>
  );
}

// Component for creating the whole board by utilizing Square
function Repeat(props) {
  let res = [];
  for (let i = 0; i < props.numTimes; i += 3) {
    res.push(
      <div className="boardRow">
        {props.ownThis.renderSquare(i)}
        {props.ownThis.renderSquare(i + 1)}
        {props.ownThis.renderSquare(i + 2)}
      </div>
    );
  }
  return res;
}

// Render board
class Board extends React.Component {
  renderSquare(i) {
    return (
      <Square
        id={i}
        value={this.props.squares[i]}
        onClick={() => this.props.onClick(i)}
      />
    );
  }

  render() {
    return (
      <div>
        <Repeat numTimes={9} ownThis={this}></Repeat>
      </div>
    );
  }
}

// Fires when user connects to a peer; renders proper UI
function connectPeer(conn, destId, self) {
  self.setState({ receiverUI: <RecUI id={destId} /> });
}

function RecUI(props) {
  return <p>You are connected to {props.id}</p>;
}

function ConnUI() {
  return <p>Connecting...</p>;
}

function createSquareVars(self) {
	const history = self.state.history.slice(0, self.state.stepNumber + 1);
  const current = history[history.length - 1];
  const squares = current.squares.slice();
	return [history, squares];
}

// Set states for both peers
function setStateAfterClick(self, draw, i, turn, history, squares) {
	self.setState({
    history: history.concat([
      {
        squares: squares
      }
    ]),
    stepNumber: history.length,
    xIsNext: !self.state.xIsNext,
    lastMoveIndex: self.state.lastMoveIndex.concat(i),
    isDraw: draw,
    isUserTurn: turn
  });
}

function highlightWinner(winner) {
  for (let sq of winner[0]) {
    _('sqr_' + sq).style.color = "red";
  }
}

function resetSquares() {
  for (let i = 0; i < 9; i++) {
    _("sqr_" + i).style.color = 'white';
  }
}

/* 
	Fires immediately when page is visited; listens for data send to user
	Renders the changes made by the destination peer
*/
function receivePeerOuter(conn, peerObj, self) {
  conn.on("data", function(data) {
    if (data.score) {
      scoreboardRef.updateScore(data.score);
    }else if ((data.player2Again && self.state.localAgain) || 
      (data.player1Again && self.state.localAgain)) {
      resetStates(self);
      self.state.connState.send({ receivedAgain: true });
    } else if (data.receivedAgain) {
      resetStates(self);
    } else {
      if (data.i === "a") {
        return;
      }
      const index = data.i;
      const squareToRemove = data.squareToRemove;
      const draw = data.isDraw;
      const [history, squares] = createSquareVars(self);
    
      squares[index] = self.state.xIsNext ? "X" : "O";
      squares[squareToRemove] = null;
      setStateAfterClick(self, draw, index, true, history, squares);	    
    }
  });
}

// Reset the states to their initial values when 'play again'
function resetStates(self) {
  self.setState({
    history: [
      {
        squares: Array(9).fill(null)
      }
    ],
    xIsNext: !self.state.isNext,
    isDraw: false,
    stepNumber: 0,
    lastMoveIndex: [0],
    isUserTurn: !self.state.isUserTurn,
    movesShow: null,
    player1Again: false,
    player2Again: false,
    localAgain: false
  });  
  self.trackSigns = [];
  _('playAgain').innerHTML = 'Play Again';
  _('playAgain').disabled = false;
  if (_("show") !== null) _("show").setAttribute("id", "hide");
  resetSquares();
}

var globalSquares;
var globalConnObj;
var scoreboardRef;

// Keep track of the scores of X and O
class Scoreboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isShown: false,
      XScore: 0,
      YScore: 0,
    }

    this.updateScore = this.updateScore.bind(this);
    scoreboardRef = this;
  }

  componentDidMount() {
    setInterval(() => {
      if (!globalSquares) return;
      let isWin = calculateWinner(globalSquares);
      if (isWin) {
        this.updateScore(isWin[1]);
        globalSquares = null;
        globalConnObj.send({score: isWin[1]});
      }
    }, 1000);
  }

  updateScore(type) {
    if (type === 'X') {
      this.setState({ XScore: this.state.XScore + 1 });
    } else {
      this.setState({ YScore: this.state.YScore + 1 });
    }
  }

  render() {
    return (
      <div className="scoreboard">
        <span id="XWin">{this.state.XScore}</span> - <span id="YWin">{this.state.YScore}</span>
      </div>
    );
  }
}

/*
	Main component; renders whole UI & utilizes the components declared above
*/
class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [
        {
          squares: Array(9).fill(null)
        }
      ],
      xIsNext: true,
      isDraw: false,
      connectYourself: false,
      stepNumber: 0,
      lastMoveIndex: [0],
      peerDisconnected: false,
      peerClosed: false,
      peerObj: null,
      uid: null,
      isUserTurn: true,
      connId: null,
      unsupportedBrowser: false,
      connState: null,
      peerError: false,
      movesShow: null,
      receiverUI: null,
      player1Again: false,
      player2Again: false,
      localAgain: false,
      scoreRecorded: false
    };
    this.trackSigns = [];
    this.handleConnection = this.handleConnection.bind(this);
    this.setConnId = this.setConnId.bind(this);
    this.playAgain = this.playAgain.bind(this);
  }

  // Play a new game without loosing the Peer JS id
  playAgain(e) {
    _('playAgain').innerHTML = 'Waiting for other player'; 
    _('playAgain').disabled = true;
    this.setState({ localAgain: true });
    if (this.state.isUserTurn) {
      this.state.connState.send({ player1Again: true });
    } else {
      this.state.connState.send({ player2Again: true });
    }
  }

  // Fires when user clicks on a field
  handleClick(i) {
    // Do not allow user to play without a peer
    if (!this.state.connId) {
      return;
    }

    const [history, squares] = createSquareVars(this);
		const filledSquares = squares.filter(sq => sq).length;
    const connObj = this.state.connState;

    globalConnObj = connObj;
    globalSquares = squares;

    // Perform a lookahead to properly decide if match is draw
    let sqrBefore = squares[i];
    squares[i] = this.state.xIsNext ? "X" : "O";
    let lookAhead = calculateWinner(squares);
    squares[i] = sqrBefore;

    // Check when match is draw; NOT USED IN THE LITE THREE VERSION
    if (filledSquares + 1 === squares.length && !lookAhead) {
      this.setState({ isDraw: true }, () => {
        // Callback send is needed because state is not updated asynchronously
        squares[i] = this.state.xIsNext ? "X" : "O";
        connObj.send({
          i,
          square: squares[i],
          isDraw: this.state.isDraw,
          squareToRemove: -1
        });
        setStateAfterClick(this, this.state.isDraw, i, !this.state.isUserTurn, history,
          squares); 
      });
      return;
      // Match is won / clicked on a filled field / not user's turn
    } else if (
      calculateWinner(squares) ||
      squares[i] ||
      !this.state.isUserTurn
    ) {
      return;
    }

    /*
      Implement a lite three version: when O or X puts the 4th sign remove the O or X that
      the user has put in earliest
    */
    this.trackSigns.push(i);
    let squareToRemove;
    if (this.trackSigns.length > 3) {
      _('sqr_' + this.trackSigns[0]).innerHTML = '';
      squares[this.trackSigns[0]] = null;
      squareToRemove = this.trackSigns[0];
      this.trackSigns.shift();
    }

    squares[i] = this.state.xIsNext ? "X" : "O";
    connObj.send({
      i,
      square: squares[i],
      isDraw: this.state.isDraw,
      squareToRemove
    });
    setStateAfterClick(this, this.state.isDraw, i, !this.state.isUserTurn, history, squares); 
  }

  // Implement 'time travel'; highlight the button clciked
  jumpTo(step) {
    _("btn_" + step).style.color = "#d8d8d8";
    for (let i = 0; i < this.state.history.length; i++) {
      if (i !== step) {
        _("btn_" + i).style.color = "white";
      }
    }

    this.setState({
      stepNumber: step,
      xIsNext: step % 2 === 0
    });

    // Make sure winner trio is only marked as red at the last step
    resetSquares();
    if (step === this.state.history.length) {
      let winner = calculateWinner(this.state.history[step]);
      highlightWinner(winner);
    }
  }

  // Load Peer JS library after UI has loaded;
  componentDidMount() {
    var aScript = document.createElement("script");
    aScript.type = "text/javascript";
    aScript.src = "./peer-min.js";

    document.head.appendChild(aScript);
    aScript.onload = () => {
      // Browser support check
      if (window.util.browser === "Unsopported") {
        this.setState({ unsupportedBrowser: true });
        return;
      } else {
        // Connect to Peer server
        var peer = new window.Peer({ key: "lwjd5qra8257b9" });
        peer.on("open", id => {
          this.setState({
            uid: id,
            peerObj: peer
          });
        });

        // Error handling
        peer.on("error", err => {
          this.setState({ peerError: err.type });
          return;
        });

        peer.on("closed", () => {
          this.setState({ peerClosed: true });
          peer.destroy();
          return;
        });

        peer.on("disconnected", () => {
          this.setState({ peerDisconnected: true });
          return;
        });

        peer.on("connection", val => {
          receivePeerOuter(val, this.state.peerObj, this);
        });
      }
    };
  }

  // Connection between two peers
  handleConnection(e) {
    // Do not let user to play without a peer or to connect to their ID
    if (!this.state.connId) {
      return;
    } else if (this.state.uid === this.state.connId) {
      this.setState({ connectYourself: true });
      return;
    }
    /*
			peerObj: window.Peer ...
			connId: destination peer ID
			uid: my ID
			conn: peer.connect(connId); ...
		*/
    let connId = this.state.connId;
    let peer = this.state.peerObj;
    let conn = this.state.connState;
    if (!conn) {
      conn = peer.connect(connId);
      this.setState({ connState: conn });
    }

    // On open will be launch when you successfully connect to PeerServer
    conn.on("open", () => {
      connectPeer(conn, connId, this);
    });
    _("idInput").value = "";
    this.setState({ receiverUI: ConnUI() });
  }

  setConnId(e) {
    this.setState({ connId: e.target.value.toLowerCase() });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(current.squares);
    const destMessage = this.state.receiverUI;
    const err = this.state.peerError;
    const closedConn = this.state.peerClosed;
    const discConn = this.state.peerDisconnected;
    const browserSupport = this.state.unsupportedBrowser;

    // Get all the moves so far; do not show them until game has ended
    const moves = history.map((step, move) => {
      const row = Math.floor(this.state.lastMoveIndex[move] / 3);
      const col =
        this.state.lastMoveIndex[move] !== 0
          ? this.state.lastMoveIndex[move] % 3
          : 0;
      const desc = move
        ? "Go to move #" + (move) + " (" + (row + 1) + "; " + (col + 1) + ")"
        : "Go to game start";

      return (
        <li key={move} id={move}>
          <button id={"btn_" + move} 
            className="w3-button timeTravel" onClick={() => this.jumpTo(move)}>
            {desc}
          </button>
        </li>
      );
    });

    // Conditional UI rendering depending on the state of the game
    let status;
    if (this.state.isDraw) {
      status = "Draw";
      if (_("hide") !== null) _("hide").setAttribute("id", "show");
    } else if (winner) {
      highlightWinner(winner);
      status = "Winner: " + winner[1];
      if (_("hide") !== null) _("hide").setAttribute("id", "show");
    } else {
      let nextUserId = this.state.uid;
      if (!nextUserId) {
        nextUserId = 'Loading...';
      } else {
        nextUserId = this.state.isUserTurn
          ? this.state.uid
          : this.state.connId;
      }
      status =
        "Next player: " +
        (this.state.xIsNext ? "X" : "O") +
        " (" +
        nextUserId +
        ")";
    }

    return (
      <React.Fragment>
        <div className="verticalCont">
          <Scoreboard />
          <div className="game">
            <div className="game-board">
              <Board
                squares={current.squares}
                onClick={i => this.handleClick(i)}
              />
            </div>
          </div>
          <br />
          <div>{this.state.connState ? status : ''}</div>
          <p>My id is <b>{!this.state.uid ? 'Loading...' : this.state.uid}</b></p>
          <input
            type="text"
            placeholder="Enter destination peer ID"
            id="idInput"
            className="w3-input w3-border w3-round"
            onChange={this.setConnId}
          />
          <button onClick={this.handleConnection}
            className='w3-button w3-round-xxlarge w3-border w3-border-white w3-border-white'
            id="connBtn"
          >
            Connect
          </button>
          {this.state.connectYourself ? (
            <p>Cannot connect to yourself. Try again.</p>
          ) : (
            ""
          )}
          {!destMessage ? <p>Not connected</p> : destMessage}
          {err ? <p>Server returned with an error: {err}</p> : ""}
          {closedConn ? <p>Oops... your peer closed the connection.</p> : ""}
          {discConn ? <p>Oops... your peer has disconnected.</p> : ""}
          {browserSupport ? <p>Current browser is not supported.</p> : ""}
          <ol id="hide">
            <button
              key="playAgainButton"
              className="w3-button w3-round-xxlarge w3-border w3-border-white w3-border-white"
              id="playAgain"
              onClick={this.playAgain}
              >
              Play again
            </button>
            {moves}
          </ol>
        </div>  
      </React.Fragment>
    );
  }
}

function _(el) {
  return document.getElementById(el);
}

ReactDOM.render(<Game />, _("root"));
