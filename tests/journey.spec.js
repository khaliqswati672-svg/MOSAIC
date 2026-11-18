import {test,expect} from '@playwright/test';
import {PerspectiveCamera,Vector3} from 'three';
import {readFileSync} from 'node:fs';
import path from 'node:path';

async function register(page){
  await page.goto('/');
  await page.getByRole('button',{name:'还没有账号？注册'}).click();
  await page.getByLabel('邮箱').fill('traveler@example.com');
  await page.getByLabel('密码').fill('MosaicTest2026');
  await page.getByRole('button',{name:'注册并登录'}).click();
  await expect(page).toHaveURL(/globe/);
}

test('注册、刷新、退出并重新登录',async ({page})=>{
  await register(page);
  await page.reload();
  await expect(page.getByRole('link',{name:'我的地图'})).toBeVisible();
  await page.getByRole('button',{name:'退出'}).click();
  await page.getByLabel('邮箱').fill('traveler@example.com');
  await page.getByLabel('密码').fill('MosaicTest2026');
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page).toHaveURL(/globe/);
});

const regionUrl='/#/country/156/guizhou';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVn8AAAAASUVORK5CYII=','base64');
const picture={name:'guizhou.png',mimeType:'image/png',buffer:png};

test('地球拖动、国家点击、中国地图、贵州、凭证、照片与视频、刷新恢复',async ({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await register(page);
  const globe=page.locator('canvas');
  await expect(globe).toBeVisible();
  const bounds=await globe.boundingBox();
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+90,y+30,{steps:8});
  await page.mouse.up();
  await expect(page.getByRole('button',{name:'进入国家地图'})).toHaveCount(0);
  await page.getByRole('button',{name:'重置视角'}).click();
  await page.waitForTimeout(1900);
  function point(lon,lat){
    const r=Math.PI/180;
    return new Vector3(Math.cos(lat*r)*Math.cos(lon*r),Math.sin(lat*r),-Math.cos(lat*r)*Math.sin(lon*r));
  }
  const camera=new PerspectiveCamera(34,bounds.width/bounds.height,.1,100);
  camera.position.copy(point(86,22).multiplyScalar(4.15));
  camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const pick=point(104,35).project(camera);
  await page.mouse.click(x+pick.x*bounds.width/2,y-pick.y*bounds.height/2);
  await expect(page.getByRole('button',{name:'进入国家地图'})).toBeVisible();
  await page.waitForTimeout(1400);
  await page.mouse.click(x,y);
  await expect(page.getByRole('heading',{name:'中国',exact:true})).toBeVisible();
  const map=page.getByRole('group',{name:'中国一级行政区地图'});
  await expect(globe).toHaveCount(0);
  await expect(map.locator('path')).toHaveCount(34);
  await expect(map.getByRole('link',{name:'台湾省',exact:true})).toBeVisible();
  await map.getByRole('link',{name:'在地图上打开台湾省'}).click();
  await expect(page.getByRole('heading',{name:'台湾省',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'点亮这个地方'}).click();
  await expect(page).toHaveURL(/country\/156\/taiwan\/verification/);
  await expect(globe).toHaveCount(0);
  await page.getByRole('link',{name:'← 台湾省'}).click();
  await page.getByRole('link',{name:'← 中国地图'}).click();
  await map.getByRole('link',{name:'贵州省',exact:true}).click();
  await page.getByRole('link',{name:'点亮这个地方'}).click();
  await page.getByRole('button',{name:'旅行凭证上传'}).click();
  await page.getByLabel('审核文件').setInputFiles(picture);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'提交演示审核'}).click();
  await expect(page.getByText(/Pending Review/)).toBeVisible();
  await page.getByRole('button',{name:'演示通过'}).click();
  await expect(page.getByText(/Document Verified/)).toBeVisible();
  await page.getByRole('link',{name:'← 贵州省'}).click();
  const video=readFileSync(path.resolve('tests/fixtures/flower.mp4'));
  for(const [title,date,file] of [['黄果树瀑布','2025-08-15',picture],['荔波小七孔','2024-04-05',{name:'libo.mp4',mimeType:'video/mp4',buffer:video}]]){
    await page.getByRole('button',{name:'添加旅行记录'}).click();
    await page.getByLabel('标题').fill(title);
    await page.getByLabel('旅行地点').fill(title);
    await page.getByLabel('旅行日期').fill(date);
    await page.getByLabel('照片或视频').setInputFiles(file);
    await page.getByRole('button',{name:'保存记录'}).click();
    await expect(page.getByRole('button',{name:'保存记录'})).toHaveCount(0);
  }
  await page.getByRole('link',{name:'浏览旅行记忆'}).click();
  await expect(page.getByRole('heading',{name:'黄果树瀑布'})).toBeVisible();
  await page.getByRole('button',{name:'放大照片'}).click();
  await page.getByRole('button',{name:'关闭放大'}).click();
  await page.getByRole('region',{name:'旅行媒体浏览'}).hover();
  await page.mouse.wheel(0,180);
  await expect(page.getByRole('heading',{name:'荔波小七孔'})).toBeVisible();
  await expect.poll(()=>page.locator('video').evaluate(video=>video.readyState)).toBeGreaterThan(0);
  await page.locator('video').evaluate(async video=>{await video.play();video.pause();});
  await page.reload();
  await expect(page.getByRole('heading',{name:'黄果树瀑布'})).toBeVisible();
  await page.getByLabel('年份').selectOption('2024');
  await expect(page.getByRole('heading',{name:'荔波小七孔'})).toBeVisible();
  await page.getByRole('button',{name:'编辑记录'}).click();
  await page.getByLabel('标题').fill('荔波小七孔 · 重游');
  await page.getByRole('button',{name:'保存记录'}).click();
  await expect(page.getByRole('heading',{name:'荔波小七孔 · 重游'})).toBeVisible();
  await page.getByRole('link',{name:'我的地图'}).click();
  await expect(page.getByText('2 条旅行记录 · 演示审核已点亮')).toBeVisible();
  await page.getByRole('link',{name:'贵州省 2 条旅行记录 · 演示审核已点亮'}).click();
  await page.getByRole('link',{name:'浏览旅行记忆'}).click();
  await page.getByRole('button',{name:'删除记录'}).click();
  await page.getByRole('button',{name:'确认删除'}).click();
  await expect(page.getByRole('heading',{name:'荔波小七孔 · 重游'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('移动布局、定位拒绝范围外坐标并验证贵阳坐标、人工演示拒绝',async ({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await register(page);
  await context.grantPermissions(['geolocation']);
  await page.goto(regionUrl+'/verification');
  await context.setGeolocation({longitude:116.4,latitude:39.9,accuracy:20});
  await page.getByRole('button',{name:'授权并验证位置'}).click();
  await expect(page.getByRole('alert')).toContainText('精度不足');
  await context.setGeolocation({longitude:106.63,latitude:26.65,accuracy:20});
  await page.getByRole('button',{name:'授权并验证位置'}).click();
  await expect(page.getByText(/Location Verified/)).toBeVisible();
  await page.getByRole('button',{name:'人工审核资料'}).click();
  await page.getByLabel('审核文件').setInputFiles(picture);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'提交演示审核'}).click();
  await expect(page.getByText('Pending · 人工待审核')).toBeVisible();
  await page.getByRole('button',{name:'演示拒绝'}).click();
  await expect(page.getByText(/Rejected/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

