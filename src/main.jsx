import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter, Routes, Route, Navigate, Link, useNavigate} from 'react-router-dom';
import {account} from './account';
import {TravelRoutes} from './TravelPages';
import './style.css';
import './atlas.css';

function Login({onLogin}) {
  const [register,setRegister] = useState(false);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { onLogin(await account.signIn(form.get('email'),form.get('password'),register)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login"><section><div className="wordmark"><i/> MOSAIC</div><h1>Every Place<br/>Tells a Story.</h1><p>每一个去过的地方，都有属于自己的故事。</p></section><form className="panel auth" onSubmit={submit}><h2>{register?'创建你的旅行地图':'登录 MOSAIC'}</h2><p>本地演示账号。账号与旅行数据保存在当前浏览器。</p><label>邮箱<input name="email" type="email" autoComplete="email" required/></label><label>密码<input name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={8} required/></label>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>{register?'注册并登录':'登录'}</button><button className="quiet" type="button" onClick={()=>{setRegister(!register);setError('')}}>{register?'已有账号？登录':'还没有账号？注册'}</button></form></main>;
}

function App(){
  const [user,setUser] = useState(account.current);
  const navigate = useNavigate();
  if(!user) return <Routes><Route path="/login" element={<Login onLogin={next=>{setUser(next);navigate('/globe',{replace:true})}}/>}/><Route path="*" element={<Navigate to="/login" replace/>}/></Routes>;
  return <><header><Link className="wordmark" to="/globe"><i/> MOSAIC</Link><nav><Link to="/globe">探索地球</Link><Link to="/profile">我的地图</Link><button onClick={()=>{account.signOut();setUser(null);navigate('/login',{replace:true})}}>退出</button></nav></header><TravelRoutes key={user.id} user={user}/></>;
}
createRoot(document.querySelector('#root')).render(<HashRouter><App/></HashRouter>);
