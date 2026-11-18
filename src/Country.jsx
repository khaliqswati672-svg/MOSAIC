import React from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {geoMercator,geoPath} from 'd3-geo';

export function CountryMap({regions,status,country}){
  const navigate=useNavigate();
  const path=geoPath(geoMercator().fitExtent([[25,20],[875,520]],{type:'FeatureCollection',features:regions}));
  const destination=region=>'/country/'+country+'/'+region.id;
  const taiwan=regions.find(region=>region.id==='taiwan');
  const [taiwanX,taiwanY]=taiwan?path.centroid(taiwan):[];
  const paint=region=>{
    const state=status(region.id);
    return state.location?'lit':state.demo?'lit demo-lit':state.records.length?'recorded':'';
  };
  return <><div className="map-frame"><svg viewBox="0 0 900 540" role="group" aria-label="中国一级行政区地图">
    {regions.map(region=><path key={region.id} d={path(region)} className={paint(region)} role="link" tabIndex={0} aria-label={region.label} onClick={()=>navigate(destination(region))} onKeyDown={e=>{if(e.key==='Enter')navigate(destination(region));}}><title>{region.label}</title></path>)}
    {taiwan&&Number.isFinite(taiwanX)&&Number.isFinite(taiwanY)&&<Link to={destination(taiwan)} className="map-callout" aria-label="在地图上打开台湾省">
      <line x1={taiwanX} y1={taiwanY} x2={taiwanX+29} y2={taiwanY+19}/>
      <circle cx={taiwanX} cy={taiwanY} r="4"/>
      <rect x={taiwanX+26} y={taiwanY+5} width="90" height="35" rx="8"/>
      <text x={taiwanX+71} y={taiwanY+23} textAnchor="middle" dominantBaseline="middle">{taiwan.label}</text>
    </Link>}
  </svg></div><div className="legend"><span>未点亮</span><span>有旅行记录</span><span>位置已验证</span><span>演示审核已点亮</span></div><div className="region-list">{regions.map(region=><Link key={region.id} to={destination(region)} className={paint(region)}>{region.label}</Link>)}</div><small>行政区数据 · geoBoundaries / Wikimedia Commons</small></>;
}
