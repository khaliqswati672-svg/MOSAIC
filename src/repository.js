let database;
function open(){
  database??=new Promise((resolve,reject)=>{
    const request=indexedDB.open('mosaic-travel',1);
    request.onupgradeneeded=()=>{
      for(const store of ['memories','reviews']){
        request.result.createObjectStore(store,{keyPath:'id'}).createIndex('user','user');
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{database=null;reject(request.error);};
  });
  return database;
}
async function run(store,mode,operation){
  const db=await open();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(store,mode);
    const request=operation(transaction.objectStore(store));
    transaction.oncomplete=()=>resolve(request.result);
    transaction.onabort=()=>reject(transaction.error||Error('保存已取消。'));
  });
}
export const repository={
  list:(kind,user)=>run(kind,'readonly',store=>store.index('user').getAll(user)),
  save:(kind,item)=>run(kind,'readwrite',store=>store.put(item)),
  remove:(kind,id)=>run(kind,'readwrite',store=>store.delete(id))
};
export const regionKey=(country,region)=>country+'/'+region;
export function stateFor(key,memories,reviews){
  const records=memories.filter(item=>item.region===key);
  const submissions=reviews.filter(item=>item.region===key);
  const location=submissions.some(item=>item.method==='location'&&item.status==='approved');
  const demo=submissions.some(item=>item.demo&&item.status==='approved');
  return {records,submissions,location,demo,lit:location||demo};
}
export async function checkMedia(file,imagesOnly=false){
  const image=['image/jpeg','image/png','image/webp'].includes(file?.type);
  const video=file?.type==='video/mp4'&&!imagesOnly;
  if(!image&&!video)throw Error(imagesOnly?'请选择 JPG、PNG 或 WebP 图片。':'请选择 JPG、PNG、WebP 或 MP4 文件。');
  if(file.size===0)throw Error('文件为空。');
  if(file.size>(video?80:15)*1024*1024)throw Error(video?'视频须小于等于 80 MB。':'图片须小于等于 15 MB。');
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const ascii=(start,end)=>String.fromCharCode(...b.slice(start,end));
  const valid={
    'image/jpeg':b[0]===255&&b[1]===216&&b[2]===255,
    'image/png':b[0]===137&&ascii(1,4)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10,
    'image/webp':ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP',
    'video/mp4':ascii(4,8)==='ftyp'
  };
  if(!valid[file.type])throw Error('文件内容与格式不符。');
}
