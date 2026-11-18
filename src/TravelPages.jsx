import React,{useEffect,useState} from 'react';
import {Routes,Route,Navigate,Link,useParams} from 'react-router-dom';
import {Globe,countryLabel} from './Globe';
import {CountryMap} from './Country';
import {loadRegions} from './maps';
import {repository,regionKey,stateFor} from './repository';
import {Verification,reviewLabel} from './Verification';
import {Memories,MemoryForm} from './Memory';

function useRegions(country){
  const [result,setResult]=useState({});
  useEffect(()=>{
    let live=true;
    loadRegions(country).then(regions=>{if(live)setResult({country,regions});},error=>{if(live)setResult({country,error:error.message});});
    return ()=>{live=false;};
  },[country]);
  return result.country===country?result:{};
}

function RegionPage({region,base,status,save}){
  const [adding,setAdding]=useState(false);
  return <main className="page"><Link to={base.substring(0,base.lastIndexOf('/'))}>← 中国地图</Link><div className="region-hero"><div className="eyebrow">中国 · 旅行地图</div><h1>{region.label}</h1><p>{status.location?'位置已验证':status.demo?'已点亮 · 演示审核':status.records.length?'有普通旅行记录 · 待点亮':'等待点亮'}</p><div className="actions"><Link className="button primary" to={base+'/verification'}>{status.lit?'查看认证与审核':'点亮这个地方'}</Link>{status.lit&&<button onClick={()=>setAdding(true)}>添加旅行记录</button>}<Link className="button" to={base+'/memories'}>浏览旅行记忆</Link></div></div>{adding&&status.lit&&<MemoryForm save={save} close={()=>setAdding(false)}/>}<section className="panel summary"><h2>旅行档案</h2><p>{status.records.length} 条旅行记录</p>{status.submissions.map(item=><p key={item.id}>{reviewLabel(item)}</p>)}</section></main>;
}

function CountryFlow({mode,memories,reviews,save,remove}){
  const {country,region:id}=useParams();
  const {regions,error}=useRegions(country);
  const status=id=>stateFor(regionKey(country,id),memories,reviews);
  if(!regions)return <main className="page"><Link to="/globe">← 地球</Link><p role={error?'alert':'status'}>{error||'正在加载行政区地图…'}</p></main>;
  if(!mode)return <main className="page country"><Link to="/globe">← 地球</Link><h1>{countryLabel(country)}</h1><p>{regions.length?'选择一级行政区，探索属于你的旅行记忆。':'此国家的一级行政区数据尚未接入。'}</p>{!!regions.length&&<CountryMap regions={regions} status={status} country={country}/>}</main>;
  const region=regions.find(feature=>feature.id===id);
  if(!region)return <Navigate to={'/country/'+country} replace/>;
  const key=regionKey(country,id),base='/country/'+key,data=status(id);
  if(mode==='verification')return <Verification key={key} region={region} base={base} submissions={data.submissions} save={item=>save('reviews',item,key)}/>;
  const saveMemory=item=>save('memories',item,key);
  if(mode==='memories')return <Memories key={key} records={data.records} region={region} base={base} save={saveMemory} remove={id=>remove(id)}/>;
  return <RegionPage key={key} region={region} base={base} status={data} save={saveMemory}/>;
}

function Profile({memories,reviews}){
  const {regions,error}=useRegions('156');
  const entries=(regions||[]).map(region=>({region,...stateFor(regionKey('156',region.id),memories,reviews)})).filter(item=>item.lit||item.records.length||item.submissions.length);
  const lit=entries.filter(item=>item.lit),location=entries.filter(item=>item.location),demo=entries.filter(item=>item.demo);
  const metrics=[[lit.length?1:0,'已点亮国家'],[lit.length,'已点亮行政区'],[location.length,'位置已验证'],[demo.length,'演示审核点亮'],[entries.filter(item=>item.records.length).length,'有普通记录的地区'],[memories.length,'旅行记录']];
  return <main className="page"><Link to="/globe">← 地球</Link><h1>我的旅行地图</h1><div className="metrics">{metrics.map(([number,label])=><div key={label} className="panel"><strong>{number}</strong><small>{label}</small></div>)}</div>{error&&<p role="alert">{error}</p>}{regions&&<CountryMap regions={regions} status={id=>stateFor(regionKey('156',id),memories,reviews)} country="156"/>}<h2>我的足迹</h2>{!entries.length&&<p>从地球选择一个地方，开始记录旅程。</p>}{entries.map(item=><Link className="panel footprint" key={item.region.id} to={'/country/156/'+item.region.id}><strong>{item.region.label}</strong><small>{item.records.length} 条旅行记录 · {item.location?'位置已验证':item.demo?'演示审核已点亮':item.submissions.some(s=>s.status==='pending')?'待审核':'未点亮'}</small></Link>)}</main>;
}

export function TravelRoutes({user}){
  const [memories,setMemories]=useState(null),[reviews,setReviews]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    Promise.all([repository.list('memories',user.id),repository.list('reviews',user.id)]).then(([m,r])=>{if(live){setMemories(m);setReviews(r);}},err=>{if(live)setError(err.message||'本地数据读取失败。');});
    return ()=>{live=false;};
  },[user.id]);
  async function save(kind,item,region){
    const entry={...item,id:item.id||crypto.randomUUID(),region,user:user.id,createdAt:item.createdAt||Date.now()};
    await repository.save(kind,entry);
    const update=kind==='memories'?setMemories:setReviews;
    update(current=>[entry,...current.filter(other=>other.id!==entry.id)]);
  }
  async function remove(id){
    if(!memories.some(item=>item.id===id))return;
    await repository.remove('memories',id);
    setMemories(current=>current.filter(item=>item.id!==id));
  }
  const props={memories,reviews,save,remove};
  return <Routes><Route path="/globe" element={<Globe/>}/>{memories&&reviews?<><Route path="/country/:country" element={<CountryFlow {...props}/>}/><Route path="/country/:country/:region" element={<CountryFlow mode="region" {...props}/>}/><Route path="/country/:country/:region/verification" element={<CountryFlow mode="verification" {...props}/>}/><Route path="/country/:country/:region/memories" element={<CountryFlow mode="memories" {...props}/>}/><Route path="/profile" element={<Profile {...props}/>}/><Route path="*" element={<Navigate to="/globe" replace/>}/></>:<Route path="*" element={<main className="page"><p role={error?'alert':'status'}>{error||'正在读取本地旅行地图…'}</p></main>}/>}</Routes>;
}
