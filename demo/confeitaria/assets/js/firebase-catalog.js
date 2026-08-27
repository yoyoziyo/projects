import {firebaseConfig} from '../../firebase-config.js';

const SDK_VERSION='11.10.0';
let contextPromise;

export function isFirebaseConfigured(){return Boolean(firebaseConfig.enabled&&firebaseConfig.apiKey&&firebaseConfig.projectId&&firebaseConfig.appId)}

export async function getFirebaseContext(){
  if(!isFirebaseConfigured())return null;
  if(!contextPromise)contextPromise=(async()=>{
    const [appSdk,authSdk,firestoreSdk]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);
    const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(firebaseConfig);
    return {app,auth:authSdk.getAuth(app),db:firestoreSdk.getFirestore(app),authSdk,firestoreSdk,storeId:firebaseConfig.storeId||'confeitaria'};
  })();
  return contextPromise;
}

export async function loadCatalogData(fallback){
  if(!isFirebaseConfigured())return {...fallback,source:'json'};
  try{
    const ctx=await getFirebaseContext();const {doc,getDoc,collection,getDocs}=ctx.firestoreSdk;
    const [storeSnapshot,productsSnapshot,categoriesSnapshot]=await Promise.all([getDoc(doc(ctx.db,'stores',ctx.storeId)),getDocs(collection(ctx.db,'stores',ctx.storeId,'products')),getDocs(collection(ctx.db,'stores',ctx.storeId,'categories')).catch(()=>null)]);
    if(!storeSnapshot.exists()||productsSnapshot.empty)return {...fallback,source:'json'};
    const store=storeSnapshot.data();const remoteProducts=productsSnapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(a.order??9999)-(b.order??9999)||a.name.localeCompare(b.name,'pt-BR'));const remoteCategories=(categoriesSnapshot?.docs||[]).map(item=>({id:item.id,...item.data()})).sort((a,b)=>(a.order??9999)-(b.order??9999)||a.name.localeCompare(b.name,'pt-BR'));
    const mergeMissing=(local,remote)=>{const remoteIds=new Set(remote.map(item=>item.id));return [...remote,...local.filter(item=>!remoteIds.has(item.id))].sort((a,b)=>(a.order??9999)-(b.order??9999)||a.name.localeCompare(b.name,'pt-BR'))};
    const migrationComplete=store.catalogInitialized===true;const categories=migrationComplete?remoteCategories:mergeMissing(fallback.categories,remoteCategories);const products=migrationComplete?remoteProducts:mergeMissing(fallback.products,remoteProducts);
    return {config:{...fallback.config,...store,business:{...fallback.config.business,...(store.business||{})},service:{...fallback.config.service,...(store.service||{})},contact:{...fallback.config.contact,...(store.contact||{})},fulfillment:{...fallback.config.fulfillment,...(store.fulfillment||{}),deliveryMethods:store.fulfillment?.deliveryMethods||fallback.config.fulfillment.deliveryMethods,paymentMethods:store.fulfillment?.paymentMethods||fallback.config.fulfillment.paymentMethods},content:{...fallback.config.content,...(store.content||{})},theme:{...fallback.config.theme,...(store.theme||{}),colors:{...fallback.config.theme?.colors,...(store.theme?.colors||{})}}},categories,products,source:'firestore'};
  }catch(error){console.warn('Firebase indisponível; usando catálogo local.',error);return {...fallback,source:'json'}}
}

