import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {checkMedia} from './repository';

export function MemoryForm({initial,save,close}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setBusy(true);setError('');
    try{
      const file=form.get('file');
      if(file.size||!initial)await checkMedia(file);
      const title=form.get('title').trim(),place=form.get('place').trim();
      if(!title||!place)throw Error('请输入标题和旅行地点。');
      await save({...initial,title,place,date:form.get('date'),description:form.get('description').trim(),media:file.size?file:initial.media});
      close();
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  return <form className="panel" onSubmit={submit}><h2>{initial?'编辑旅行记录':'添加旅行记录'}</h2><label>标题<input name="title" required maxLength={100} defaultValue={initial?.title}/></label><label>旅行地点<input name="place" required maxLength={100} defaultValue={initial?.place}/></label><label>旅行日期<input name="date" type="date" required defaultValue={initial?.date}/></label><label>描述<textarea name="description" rows="3" maxLength={1200} defaultValue={initial?.description}/></label><label>{initial?'替换媒体（可选）':'照片或视频'}<input name="file" type="file" required={!initial} accept="image/jpeg,image/png,image/webp,video/mp4"/></label><small>JPG、PNG、WebP ≤ 15 MB · MP4 ≤ 80 MB</small>{error&&<p role="alert">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>保存记录</button><button type="button" disabled={busy} onClick={close}>取消</button></div></form>;
}

function Media({record}){
  const [url,setUrl]=useState(''),[error,setError]=useState(false);
  const dialog=useRef(null);
  useEffect(()=>{const link=URL.createObjectURL(record.media);setUrl(link);return()=>URL.revokeObjectURL(link);},[record.media]);
  if(error)return <p role="alert">无法播放或显示此文件。请检查编码或替换媒体。</p>;
  if(!url)return null;
  if(record.media.type==='video/mp4')return <video key={url} src={url} playsInline preload="metadata" controls onError={()=>setError(true)}/>;
  return <><button className="photo" onClick={()=>dialog.current.showModal()} aria-label="放大照片"><img src={url} alt={record.title} onError={()=>setError(true)}/></button><dialog ref={dialog}><button onClick={()=>dialog.current.close()}>关闭放大</button><img src={url} alt={record.title}/></dialog></>;
}

export function Memories({records,region,base,save,remove}){
  const [year,setYear]=useState(''),[place,setPlace]=useState(''),[sort,setSort]=useState('desc');
  const [index,setIndex]=useState(0),[edit,setEdit]=useState(null),[confirm,setConfirm]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const lastWheel=useRef(0),touch=useRef(null);
  const years=[...new Set(records.map(item=>item.date.slice(0,4)))].sort().reverse();
  const places=[...new Set(records.map(item=>item.place))].sort();
  const filtered=records.filter(item=>(!year||item.date.startsWith(year))&&(!place||item.place===place)).sort((a,b)=>(sort==='desc'?b.date.localeCompare(a.date):a.date.localeCompare(b.date))||a.id.localeCompare(b.id));
  const current=Math.min(index,filtered.length-1),record=filtered[current];
  function next(step){if(!edit&&!confirm)setIndex(Math.max(0,Math.min(filtered.length-1,current+step)));}
  function filter(set,value){set(value);setIndex(0);setEdit(null);setConfirm(null);}
  return <main className="page memories"><Link to={base}>← {region.label}</Link><h1>旅行记忆</h1><div className="actions filters"><label>年份<select value={year} onChange={e=>filter(setYear,e.target.value)}><option value="">全部年份</option>{years.map(value=><option key={value}>{value}</option>)}</select></label><label>旅行地点<select value={place} onChange={e=>filter(setPlace,e.target.value)}><option value="">全部地点</option>{places.map(value=><option key={value}>{value}</option>)}</select></label><label>日期排序<select value={sort} onChange={e=>filter(setSort,e.target.value)}><option value="desc">最近优先</option><option value="asc">最早优先</option></select></label></div>
  {!record&&<p>此筛选条件下没有旅行记录。</p>}
  {record&&<><section className="media-stage" tabIndex={0} aria-label="旅行媒体浏览" onKeyDown={e=>{if(e.target===e.currentTarget&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();next(e.key==='ArrowDown'?1:-1)}}} onWheel={e=>{if(Math.abs(e.deltaY)>8&&performance.now()-lastWheel.current>450){lastWheel.current=performance.now();next(Math.sign(e.deltaY));}}} onTouchStart={e=>{touch.current=e.touches[0].clientY}} onTouchEnd={e=>{if(touch.current===null)return;const delta=touch.current-e.changedTouches[0].clientY;if(Math.abs(delta)>40)next(Math.sign(delta));touch.current=null;}}><Media key={record.id} record={record}/></section><div className="memory-strip"><div><small>{record.date} · {record.place}</small><h2>{record.title}</h2>{record.description&&<p>{record.description}</p>}</div><div className="actions"><button disabled={current===0||!!edit||!!confirm} onClick={()=>next(-1)}>↑ 上一条</button><small>{current+1} / {filtered.length}</small><button disabled={current===filtered.length-1||!!edit||!!confirm} onClick={()=>next(1)}>↓ 下一条</button></div></div><div className="actions"><button onClick={()=>{setEdit(record);setConfirm(null)}} disabled={busy}>编辑记录</button><button onClick={()=>{setConfirm(record.id);setEdit(null)}} disabled={busy}>删除记录</button></div></>}
  {edit&&<MemoryForm key={edit.id} initial={edit} save={save} close={()=>setEdit(null)}/>}
  {confirm&&<div className="panel"><p>永久删除这条本地旅行记录？</p><div className="actions"><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await remove(confirm);setConfirm(null);}catch(err){setError(err.message);}finally{setBusy(false);}}}>确认删除</button><button disabled={busy} onClick={()=>setConfirm(null)}>取消删除</button></div></div>}{error&&<p role="alert">{error}</p>}</main>;
}
