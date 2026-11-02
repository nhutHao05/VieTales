import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// The supplied licensed GLB is loaded locally, without the external embed.
export async function createGLBDisplay(stage) {
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.1;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.01,100);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;
 controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI-.08;
 controls.autoRotateSpeed=.6;
 const materials=new Set(),geometries=new Set(),textures=new Set();
 let env,model,raf=null,visible=false,disposed=false,previous=0,distance=8;
 function releaseAssets(){
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);
   if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
    materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
   });
  });
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
  env?.dispose();controls.dispose();renderer.dispose();renderer.domElement.remove();
 }
 try{
  const gltf=await new GLTFLoader().loadAsync('/models/dong-son-drum.glb');
  model=gltf.scene;scene.add(model);
  model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
  const extent=Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(extent)||extent<=0)throw new Error('Invalid model bounds');
  const holder=new T.Group();scene.remove(model);holder.add(model);scene.add(holder);
  const center=bounds.getCenter(new T.Vector3());model.position.sub(center);
  holder.scale.setScalar(4/extent);
  model=holder;
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
  try{env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.85;}
  finally{room.dispose();pmrem.dispose();}
 }catch(error){releaseAssets();throw error;}
 scene.add(new T.HemisphereLight(0xfffaef,0x888d96,1.1));
 const key=new T.DirectionalLight(0xfff1da,2.2);key.position.set(4,6,5);scene.add(key);
 const fill=new T.DirectionalLight(0xe5edff,1.3);fill.position.set(-4,3,-5);scene.add(fill);
 function pose(angle=.35){
  controls.autoRotate=false;model.rotation.y=0;
  controls.enableDamping=false;controls.update();
  controls.target.set(0,0,0);
  camera.position.set(Math.sin(angle)*distance,distance*.38,Math.cos(angle)*distance);
  controls.update();controls.enableDamping=true;
 }
 function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  const old=distance;renderer.setSize(w,h,false);camera.aspect=w/h;
  distance=2.5/Math.tan(T.MathUtils.degToRad(17))/Math.min(1,camera.aspect);
  controls.minDistance=distance*.5;controls.maxDistance=distance*2.2;
  camera.position.sub(controls.target).multiplyScalar(distance/old).add(controls.target);
  camera.updateProjectionMatrix();controls.update();
 }
 function render(now){
  raf=null;if(disposed||!visible||document.hidden)return;
  controls.update(Math.min((now-previous)/1000,.05));previous=now;
  renderer.render(scene,camera);raf=requestAnimationFrame(render);
 }
 function resume(){if(!disposed&&visible&&!document.hidden&&raf===null){previous=performance.now();raf=requestAnimationFrame(render);}}
 function visibility(){if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}resume();}
 const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(!visible&&raf!==null){cancelAnimationFrame(raf);raf=null;}resume();});
 const ro=new ResizeObserver(fit);
 stage.appendChild(renderer.domElement);fit();pose();ro.observe(stage);io.observe(stage);
 document.addEventListener('visibilitychange',visibility);
 return {
  capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  reset:()=>pose(),view:angle=>pose(angle),turn:delta=>{model.rotation.y+=delta;},
  animate:value=>{controls.autoRotate=value;},
  zoom:factor=>{const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update();},
  dispose(){disposed=true;if(raf!==null)cancelAnimationFrame(raf);io.disconnect();ro.disconnect();document.removeEventListener('visibilitychange',visibility);releaseAssets();}
 };
}
