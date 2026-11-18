import React,{useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {geoContains,geoCentroid} from 'd3-geo';
import {feature} from 'topojson-client';
import atlas from 'world-atlas/countries-110m.json';

const countries = feature(atlas,atlas.objects.countries).features;
const chinese = new Intl.DisplayNames(['zh-CN'],{type:'region'});
const name = country => country.id==='156'?chinese.of('CN'):country.properties.name;
const rad = Math.PI / 180;
function position(lon,lat) {
  return new THREE.Vector3(Math.cos(lat*rad)*Math.cos(lon*rad),Math.sin(lat*rad),-Math.cos(lat*rad)*Math.sin(lon*rad));
}
function paintTexture(selected, base) {
  const canvas = document.createElement('canvas');
  canvas.width=2048; canvas.height=1024;
  const ctx=canvas.getContext('2d');
  if(base) ctx.drawImage(base,0,0,2048,1024);
  else {
    const ocean=ctx.createLinearGradient(0,0,0,1024);
    ocean.addColorStop(0,'#254767'); ocean.addColorStop(.52,'#0b3157'); ocean.addColorStop(1,'#244865');
    ctx.fillStyle=ocean; ctx.fillRect(0,0,2048,1024);
  }
  for(const country of countries){
    ctx.beginPath();
    const polygons=country.geometry.type==='Polygon'?[country.geometry.coordinates]:country.geometry.coordinates;
    for(const polygon of polygons) for(const ring of polygon) {
      ring.forEach(([lon,lat],index)=>ctx[index?'lineTo':'moveTo']((lon+180)/360*2048,(90-lat)/180*1024));
      ctx.closePath();
    }
    if(!base || country===selected){
      ctx.fillStyle=country===selected?'rgba(75,222,250,.52)':'#557477';
      ctx.fill('evenodd');
    }
    ctx.strokeStyle=country===selected?'#a0efff':'rgba(195,225,243,.38)';
    ctx.lineWidth=country===selected?2.2:.85;
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}

export function Globe(){
  const mount=useRef(null), api=useRef(null);
  const [selected,setSelected]=useState(null),[error,setError]=useState('');
  const navigate=useNavigate();
  useEffect(()=>{
    const host=mount.current;
    let renderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}
    catch {setError('当前浏览器无法初始化 WebGL。请启用硬件加速后重试。');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    host.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','可旋转的三维地球');
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(34,1,.1,100);
    const home=position(86,22).multiplyScalar(4.15);
    camera.position.copy(home);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true; controls.enablePan=false; controls.minDistance=2.2;controls.maxDistance=8;
    controls.rotateSpeed=.53;controls.zoomSpeed=.73;
    const material=new THREE.MeshStandardMaterial({map:paintTexture(),roughness:.94});
    const globe=new THREE.Mesh(new THREE.SphereGeometry(1,128,96),material);scene.add(globe);
    scene.add(new THREE.AmbientLight(0xc8e3ff,1.1));
    const sun=new THREE.DirectionalLight(0xe0f2ff,2.0);scene.add(sun);
    const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.013,96,64),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:'varying vec3 vn; varying vec3 vp; void main(){vec4 p=modelViewMatrix*vec4(position,1.); vp=-p.xyz;vn=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}',
      fragmentShader:'varying vec3 vn; varying vec3 vp;void main(){float rim=pow(1.-max(0.,dot(normalize(vn),normalize(vp))),4.);gl_FragColor=vec4(.16,.47,.9,rim*.66);}'
    }));
    scene.add(atmosphere);
    let active, target, start, frame, disposed=false, base, pointers=new Set();
    const paint=()=>{material.map.dispose();material.map=paintTexture(active,base);};
    const image=new Image();
    image.onload=()=>{if(!disposed){base=image;paint();}};
    image.src=import.meta.env.BASE_URL+'earth.jpg';
    const focus=(country)=>{active=country;setSelected(country);paint();target=position(...geoCentroid(country)).multiplyScalar(3.85);};
    function enter(country){
      navigate('/country/'+(country.id||encodeURIComponent(country.properties.name)));
    }
    api.current={enter,china:()=>focus(countries.find(c=>c.id==='156')), reset:()=>{active=null;setSelected(null);paint();target=home.clone();},zoom:factor=>{target=camera.position.clone().setLength(THREE.MathUtils.clamp(camera.position.length()*factor,2.2,8));}};
    function down(event){pointers.add(event.pointerId);target=null;start=pointers.size===1?[event.clientX,event.clientY]:null;}
    function move(event){if(start&&Math.hypot(event.clientX-start[0],event.clientY-start[1])>6)start=null;}
    function up(event){
      pointers.delete(event.pointerId);
      if(!start||pointers.size||event.type==='pointercancel'){start=null;return;}
      start=null;
      const rect=host.getBoundingClientRect(),caster=new THREE.Raycaster();
      caster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
      const hit=caster.intersectObject(globe)[0]?.point.normalize();
      if(!hit)return;
      const point=[Math.atan2(-hit.z,hit.x)/rad,Math.asin(hit.y)/rad];
      const country=countries.find(item=>geoContains(item,point));
      if(country===active&&country) enter(country);
      else if(country) focus(country);
    }
    const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up};
    for(const [event,handler] of Object.entries(listeners)) renderer.domElement.addEventListener(event,handler);
    const observer=new ResizeObserver(()=>{
      camera.aspect=host.clientWidth/Math.max(1,host.clientHeight); camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth,host.clientHeight);
    });
    observer.observe(host);
    function render(){
      frame=requestAnimationFrame(render);
      if(target) {
        const current=camera.position.clone().normalize(), desired=target.clone().normalize();
        const rotation=new THREE.Quaternion().setFromUnitVectors(current,desired);
        current.applyQuaternion(new THREE.Quaternion().slerp(rotation,.075));
        camera.position.copy(current.multiplyScalar(THREE.MathUtils.lerp(camera.position.length(),target.length(),.075)));
        if(camera.position.distanceTo(target)<.002)target=null;
      }
      controls.update();sun.position.copy(camera.position).add(new THREE.Vector3(-1,3,0));renderer.render(scene,camera);
    }
    render();
    return ()=>{
      disposed=true;api.current=null;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      for(const [event,handler] of Object.entries(listeners)) renderer.domElement.removeEventListener(event,handler);
      globe.geometry.dispose();material.map.dispose();material.dispose();atmosphere.geometry.dispose();atmosphere.material.dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[navigate]);
  return <main className="globe-page"><section className="globe-intro"><div className="eyebrow">MOSAIC / TRAVEL ATLAS</div><h1>每一处，<br/>都有故事。</h1><p>Every Place Tells a Story.</p><button onClick={()=>api.current?.china()}>定位中国 ↗</button></section><div className="globe-view" ref={mount}/>{error&&<p className="globe-error" role="alert">{error}</p>}<aside className="globe-tools" aria-label="地球控制"><button aria-label="放大" onClick={()=>api.current?.zoom(.8)}>＋</button><button aria-label="缩小" onClick={()=>api.current?.zoom(1.25)}>−</button><button aria-label="重置视角" onClick={()=>api.current?.reset()}>◎</button></aside><footer className="globe-footer"><small>拖动旋转 · 滚轮或双指缩放 · 点击国家</small>{selected&&<div className="selection"><strong>{name(selected)}</strong><button className="primary" onClick={()=>api.current?.enter(selected)}>进入国家地图 →</button></div>}</footer></main>;
}

export const countryLabel = id => {
  const country=countries.find(item=>item.id===id || (!item.id && item.properties.name===id));
  return country ? name(country) : '未知国家';
};
