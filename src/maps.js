import {geoArea,geoContains} from 'd3-geo';

const labels='海南省 台湾省 广西壮族自治区 福建省 云南省 贵州省 江西省 湖南省 浙江省 上海市 重庆市 湖北省 四川省 安徽省 江苏省 河南省 西藏自治区 山东省 青海省 宁夏回族自治区 陕西省 天津市 山西省 北京市 甘肃省 河北省 辽宁省 吉林省 新疆维吾尔自治区 内蒙古自治区 黑龙江省 澳门特别行政区 香港特别行政区 广东省'.split(' ');
const names='Hainan,Taiwan,Guangxi,Fujian,Yunnan,Guizhou,Jiangxi,Hunan,Zhejiang,Shanghai,Chongqing,Hubei,Sichuan,Anhui,Jiangsu,Henan,Tibet,Shandong,Qinghai,Ningxia,Shaanxi,Tianjin,Shanxi,Beijing,Gansu,Hebei,Liaoning,Jilin,Xinjiang,Inner,Heilongjiang,Macau,Hong,Guangzhou'.split(',');
const providers={'156':'china.geojson'};
const cache=new Map();
export function loadRegions(country) {
  if(!providers[country])return Promise.resolve([]);
  if(!cache.has(country))cache.set(country,fetch(import.meta.env.BASE_URL+providers[country]).then(async response=>{
    if(!response.ok)throw Error('行政区数据加载失败。');
    const data=await response.json();
    return data.features.map(feature=>{
      const name=feature.properties.shapeName.split(' ')[0];
      // d3-geo expects clockwise exterior rings for small geographic polygons.
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
      for(const coordinates of polygons){
        if(geoArea({type:'Polygon',coordinates})>2*Math.PI)coordinates.forEach(ring=>ring.reverse());
      }
      return {...feature,id:name.toLowerCase(),label:labels[names.indexOf(name)]||feature.properties.shapeName};
    });
  }).catch(error=>{cache.delete(country);throw error;}));
  return cache.get(country);
}

export function containsAccuratePosition(region,{longitude,latitude,accuracy}) {
  if(![longitude,latitude,accuracy].every(Number.isFinite)||accuracy<=0||accuracy>150||Math.abs(latitude)>=89||Math.abs(longitude)>180)return false;
  const latitudeRadius=accuracy/110500;
  const longitudeRadius=latitudeRadius/Math.cos(latitude*Math.PI/180);
  return geoContains(region,[longitude,latitude])&&Array.from({length:16},(_,i)=>{
    const angle=i*Math.PI/8;
    return geoContains(region,[longitude+longitudeRadius*Math.cos(angle),latitude+latitudeRadius*Math.sin(angle)]);
  }).every(Boolean);
}
