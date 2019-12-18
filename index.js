import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

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

function Square(props) {
  return (
    <button id={props.id} className="square" 
		  onClick={props.onClick}
    >
	  {props.value} 
    </button>
  );
}

function Repeat(props) {
  let res = [];
  for (let i = 0; i < props.numTimes; i += 3) {
	res.push(<div className='boardRow'>
	  {props.ownThis.renderSquare(i)}
	  {props.ownThis.renderSquare(i + 1)}
	  {props.ownThis.renderSquare(i + 2)}
	</div>);	
  }
  return res;
}

class Board extends React.Component {
   renderSquare(i) {
    return <Square id={i} value={this.props.squares[i]} 
			onClick={() => this.props.onClick(i)}
		   />;
  }

  render() {
    return (
      <div>
        <Repeat numTimes={9} ownThis={this}></Repeat>
	  </div>
    );
  }
}

function connectPeer(conn, destId, self) {
	conn.send('hi');
	self.setState({receiverUI: <RecUI id={destId} />});
}

function RecUI(props) {
	return <p>You are connected to {props.id}</p>;
}

function receivePeerOuter(conn, peerObj, self) {
	conn.on('data', function(data){
		if (data[0] === 'a') {
			console.log('llllll');
			return;
		}
		let index = Number(data.split('||')[0]);
	
		const history = self.state.history.slice(0, self.state.stepNumber + 1);
		const current = history[history.length - 1];
		const squares = current.squares.slice();
		
		squares[index] = self.state.xIsNext ? 'X' : 'O';
		self.setState({
		  history: history.concat([{
			squares: squares
		  }]),
		  stepNumber: history.length,
		  xIsNext: !self.state.xIsNext,
		  lastMoveIndex: self.state.lastMoveIndex.concat(index),
		  isUserTurn: true
		});
	});
}

class Game extends React.Component {
  constructor(props) {
    super(props);
	this.state = {
	  history: [{
		squares: Array(9).fill(null)
	  }],
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
	  receiverUI: null
	};
	this.handleConnection = this.handleConnection.bind(this);
	this.setConnId = this.setConnId.bind(this);
  }

  handleClick(i){
  	if (!this.state.connId) {
		return;
	}
	const history = this.state.history.slice(0, this.state.stepNumber + 1);
	const current = history[history.length - 1];
	const squares = current.squares.slice();
	const filledSquares = squares.filter((sq) => sq).length;
	const connObj = this.state.connState;

	let sqrBefore = squares[i];
	squares[i] = this.state.xIsNext ? 'X' : 'O';
	let lookAhead = calculateWinner(squares);
	squares[i] = sqrBefore;
	if (filledSquares + 1 === squares.length && !lookAhead) {
	  this.setState({
	    history: history.concat([{
		  squares: squares
	 	}]), 
		isDraw: true,
		stepNumber: history.length,
		lastMoveIndex: this.state.lastMoveIndex.concat(i)
	  });	
	} else if (calculateWinner(squares) || squares[i] || !this.state.isUserTurn) {	
		if(!this.state.isUserTurn) {
			console.log('a')
		}
      return;
	}

	squares[i] = this.state.xIsNext ? 'X' : 'O';
	connObj.send(i + '||' + squares[i]);
	 this.setState({
	  history: history.concat([{
		squares: squares
	  }]),
	  stepNumber: history.length,
	  xIsNext: !this.state.xIsNext,
	  lastMoveIndex: this.state.lastMoveIndex.concat(i),
	  isUserTurn: !this.state.isUserTurn
	});
 }

  jumpTo(step) {
	_('btn_' + step).style.backgroundColor = 'blue';	
	for (let i = 0; i < this.state.history.length; i++) {
	  if (i === 1) continue;
	  if (i !== step) {
	    _('btn_' + i).style.backgroundColor = 'white';
	  }
	}
	this.setState({
	  stepNumber: step,
	  xIsNext: (step % 2) === 0
	});
  }

  componentDidMount() {
    var aScript = document.createElement('script');
    aScript.type = 'text/javascript';
    aScript.src = './peer-min.js';

    document.head.appendChild(aScript);
    aScript.onload = () => {	
		if (window.util.browser === 'Unsopported') {
			this.setState({unsupportedBrowser: true});
			return;
		} else {
			var peer = new window.Peer({key: 'lwjd5qra8257b9'});
			peer.on('open', (id) => {
				this.setState({
					uid: id,
					peerObj: peer
				});
			});   	
			peer.on('error', (err) => {
				this.setState({peerError: err.type});
				return;
			});
			peer.on('closed', () => {
				this.setState({peerClosed: true});
				peer.destroy();
				return;
			});
			peer.on('disconnected', () => {
				this.setState({peerDisconnected: true});
				return;
			});
			peer.on('connection', (val) => {
				receivePeerOuter(val, this.state.peerObj, this);
			}); 
		}
	};
}
	
	handleConnection(e) {
		if (!this.state.connId) {
			return;
		} else if (this.state.uid === this.state.connId) {
			this.setState({connectYourself: true});
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
			this.setState({connState: conn});
		}

		// on open will be launch when you successfully connect to PeerServer
		conn.on('open', () => {
			connectPeer(conn, connId, this);
		});
		_('idInput').value = '';
	}

	setConnId(e) {
		this.setState({connId: e.target.value});
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

	const moves = history.map((step, move) => {
	  if (move === 1) return;
	  const row = Math.floor((this.state.lastMoveIndex[move]) / 3);
	  const col = 
		this.state.lastMoveIndex[move] !== 0 ? 
		  this.state.lastMoveIndex[move] % 3 : 0; 
	  const desc = 
		move ? 'Go to move #' + (move - 1) + ' (' + row + '; ' + col + ')' 
		: 'Go to game start';

	  return (
		<li key={move} id={move}>
		  <button id={'btn_' + move} onClick={() => this.jumpTo(move)}>{desc}</button>
		</li>
	  );
	});


	let status;
	if (this.state.isDraw) {
      status = 'Draw';
	  if(_('hide') != null) _('hide').setAttribute('id', 'show'); 
	} else if (winner) {
	  for (let sq of winner[0]) {
        _(sq).style.backgroundColor = 'yellow';
	  }
	  status = 'Winner: ' + winner[1];
	  if(_('hide') != null) _('hide').setAttribute('id', 'show'); 
	} else {
	  let nextUserId = this.state.isUserTurn ? this.state.uid : this.state.connId;
	  status = 'Next player: ' + (this.state.xIsNext ? 'X' : 'O') + ' (' + nextUserId + ')';
	}

    return (	
	  <React.Fragment>
		  <div className="game">
			<div className="game-board">
			  <Board squares={current.squares}
				onClick={(i) => this.handleClick(i)}
			  />
			</div>
			<div className="game-info"></div>
		  </div><br />
		  <div>{status}</div>
		  <p>My id is {this.state.uid}</p>
	  	  <input type='text' placeholder='id' id='idInput' onChange={this.setConnId} />
		  <button onClick={this.handleConnection} id='connBtn'>Connect</button>
		  {this.state.connectYourself ? <p>Cannot connect to yourself. Try again.</p> : ''}
		  {!destMessage ? <p>Not connected</p> : destMessage}
		  {err ? <p>Server returned with an error: {err}</p> : ''}
		  {closedConn ? <p>Oops... your peer closed the connection.</p> : ''}
		  {discConn ? <p>Oops... your peer has disconnected.</p> : ''}
		  {browserSupport ? <p>Current browser is not supported.</p> : ''}
		  <ol id='hide'>{moves}</ol>
	  </React.Fragment>
    );
  }
}

function _(el){
	return document.getElementById(el);
}

ReactDOM.render(
  <Game />,
  _('root')
);

