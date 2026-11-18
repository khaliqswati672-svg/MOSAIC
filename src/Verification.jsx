import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {checkMedia} from './repository';
import {containsAccuratePosition} from './maps';

const methods={location:'地理位置记录',document:'旅行凭证上传',manual:'人工审核资料'};
export function reviewLabel(item){
  if(item.method==='location')return 'Location Verified · 位置已验证';
  if(item.status==='pending')return item.method==='document'?'Pending Review · 凭证待审核':'Pending · 人工待审核';
  if(item.status==='rejected')return 'Rejected · 演示审核未通过';
  return item.method==='document'?'Document Verified · 演示凭证已验证':'Approved · 演示人工审核通过';
}
export function Verification({region,base,submissions,save}){
  const [method,setMethod]=useState('location'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function action(work){
    setBusy(true);setError('');
    try{await work();}catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  function locate(){
    action(async()=>{
      if(!navigator.geolocation)throw Error('浏览器无法获取定位。');
      const position=await new Promise((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,error=>reject(Error(error.code===1?'未获定位权限。':'无法获取位置，请稍后重试。')),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
      });
      if(!containsAccuratePosition(region,position.coords))throw Error('位置不在地区内、靠近边界或精度不足（要求 150 米以内）。');
      await save({method:'location',status:'approved',demo:false});
    });
  }
  function submit(event){
    event.preventDefault();
    const form=event.currentTarget;
    const values=new FormData(form);
    action(async()=>{
      const proof=values.get('proof');
      await checkMedia(proof,method==='document');
      await save({method,status:'pending',demo:true,proof,category:values.get('category')||null});
      form.reset();
    });
  }
  return <main className="page"><Link to={base}>← {region.label}</Link><h1>点亮这个地方</h1><p>Light Up This Place · {region.label}</p><div className="actions method-tabs">{Object.entries(methods).map(([id,label])=><button className={method===id?'primary':''} type="button" aria-pressed={method===id} key={id} onClick={()=>{setMethod(id);setError('')}} disabled={busy}>{label}</button>)}</div><section className="panel">
  {method==='location'?<><h2>验证当前位置</h2><p>点击后浏览器会请求定位授权。坐标只用来检查行政区边界，应用仅保存验证结果。</p><button className="primary" onClick={locate} disabled={busy}>授权并验证位置</button></>:<form onSubmit={submit}><h2>{methods[method]}</h2><p>本地演示审核。提交资料后可手动模拟审核决定。凭证和审核资料仅保存在本浏览器。</p>{method==='document'&&<label>凭证类型<select name="category">{['车票','飞机票','酒店订单','景区门票','其他凭证'].map(type=><option key={type}>{type}</option>)}</select></label>}<label>审核文件<input aria-label="审核文件" type="file" name="proof" required accept={method==='document'?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,video/mp4'}/></label><label className="check"><input type="checkbox" required/>我已在上传前遮盖身份证号、订单编号、二维码等敏感信息。</label><button className="primary" disabled={busy}>提交演示审核</button></form>}
  {error&&<p role="alert">{error}</p>}</section><h2>认证与审核记录</h2>{!submissions.length&&<p>还没有验证或审核记录。</p>}
  {submissions.map(item=><article className="panel review" key={item.id}><strong>{reviewLabel(item)}</strong><small>{methods[item.method]}{item.category&&' · '+item.category}</small>{item.status==='pending'&&item.demo&&<div className="actions"><button disabled={busy} onClick={()=>action(()=>save({...item,status:'approved'}))}>演示通过</button><button disabled={busy} onClick={()=>action(()=>save({...item,status:'rejected'}))}>演示拒绝</button></div>}</article>)}</main>;
}
