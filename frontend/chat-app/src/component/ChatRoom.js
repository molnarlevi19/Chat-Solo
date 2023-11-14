import React from "react";
import { useState } from "react";
import { over } from 'stompjs';
import SockJS from "sockjs-client";

let stompClient = null;

const ChatRoom = () => {
    const [publicChats, setPublicChats] = useState([]);
    const [privateChats, setPrivateChats] = useState(new Map());
    const [tab, setTab] = useState("CHATROOM");
    const [userData, setUserData] = useState({
        username: "",
        recieverName: "",
        connected: false,
        message: ""
    })

    const handleValue = (event) => {
        const { value,name } = event.target;
        setUserData({ ...userData, [name]: value });
    }

    const handleMessage = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "message": value });
    }

    const registerUser = () => {
        let sock = new SockJS("http://localhost:8080/ws");
        stompClient = over(sock);
        stompClient.connect({}, onConnected, onError);
    }

    const onConnected = () => {
        setUserData({ ...userData, "connected": true });
        stompClient.subscribe('/chatroom/public', onPublicMessageReceived);
        stompClient.subscribe('/user/' + userData.username + '/private', onPrivateMessageReceived);
        userJoin();
    }

    const userJoin = () => {
                let chatMessage={
                    senderName:userData.username,
                    status:'JOIN'
                };
                stompClient.send("/app/message", {},JSON.stringify(chatMessage));
    }

    const onPublicMessageReceived = (payLoad) => {
        let payLoadData = JSON.parse(payLoad.body);
        switch (payLoadData.status) {
            case "JOIN":
                if (!privateChats.get(payLoadData.senderName)) {
                    privateChats.set(payLoadData.senderName, []);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case "MESSAGE":
                publicChats.push(payLoadData);
                setPublicChats([...publicChats]);
                break;
            default:
        }
    }

    const onPrivateMessageReceived = (payLoad) => {
        let payLoadData = JSON.parse(payLoad);
        if (privateChats.get(payLoad.senderName)) {
            privateChats.get(payLoadData.senderName).push(payLoadData);
            setPrivateChats(new Map(privateChats));
        } else {
            let list = [];
            list.push(payLoadData);
            privateChats.set(payLoadData.senderName, list);
            setPrivateChats(new Map(privateChats));
        }
    }

    const onError = (err) => {
        console.log(err);
    }

    const sendPublicMessage = () => {
        if(stompClient){
            let chatMessage={
                senderName:userData.username,
                message:userData.message,
                status:'MESSAGE'
            };
            stompClient.send("/app/message", {},JSON.stringify(chatMessage));
            setUserData({...userData,"message":""});
        }
    }

    const sendPrivateMessage = () => {
        if(stompClient){
            let chatMessage={
                senderName:userData.username,
                recieverName:tab,
                message:userData.message,
                status:'MESSAGE'
            };
            if(userData.username !== tab){
                privateChats.set(tab).push(chatMessage);
                setPrivateChats(new Map(privateChats));
            }
            stompClient.send("/app/private-message", {},JSON.stringify(chatMessage));
            setUserData({...userData,"message":""});
        }
    }

    return (
        <div className="container">
            {userData.connected} ?
            <div className="chat-box">
                <div className="member-list">
                    <ul>
                        <li onClick={() => [setTab("CHATROOM")]} className={`member ${tab === "CHATROOM" && "active"}`}>ChatRoom</li>
                        {[...privateChats.keys()].map((name,index)=>(
                            <li onClick={() => [setTab(name)]} className={`member ${tab === name && "active"}`} key={index}>
                                {name}
                            </li>
                        ))}
                    </ul>
                    {tab === "CHATROOM" && <div className="chat-content">
                        <ul className="chat-messages">
                    {publicChats.map((chat,index)=>(
                            <li className="message" key={index}>
                                {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                <div className="message-data">{chat.message}</div>
                                {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}

                            </li>
                        ))}
                        </ul>

                        <div className="send-message">
                        <input type="text" className="input-message" name="message" placeholder="enter public message" 
                        value={userData.message} onChange={handleValue}/>
                        <button type="button" className="send-button" onClick={sendPublicMessage}>send</button>
                        </div>
                    </div>}
                    {tab !== "CHATROOM" && <div className="chat-content">
                    <ul className="chat-messages">
                    {[...privateChats.get(tab)].map((chat,index)=>(
                            <li className="message" key={index}>
                                {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                <div className="message-data">{chat.message}</div>
                                {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}

                            </li>
                        ))}
                        </ul>

                        <div className="send-message">
                        <input type="text" className="input-message" name="message" placeholder={`enter private message for ${tab}`} 
                        value={userData.message} onChange={handleValue}/>
                        <button type="button" className="send-button" onClick={sendPrivateMessage}>send</button>
                        </div>
                    </div>}
                </div>
            </div>
            :
            <div className="register">
                <input
                    id='user-name'
                    name="username"
                    placeholder="Enter the user name"
                    value={userData.username}
                    onChange={handleValue}
                />
                <button type="button" onClick={registerUser}>
                    connect
                </button>
            </div>

        </div>
    )
}

export default ChatRoom;