const STORAGE_KEY='yoites-catalog-cart-v2';
const listeners=new Set();let items=read();
function read(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))??[]}catch{return[]}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));listeners.forEach(fn=>fn(getCart()))}
export function getCart(){return items.map(item=>({...item}))}
export function addItem(product,variant){const id=`${product.id}::${variant.id}`;const current=items.find(item=>item.id===id);if(current)current.quantity+=1;else items.push({id,productId:product.id,variantId:variant.id,variantLabel:variant.label,name:product.name,price:variant.price,quantity:1});save()}
export function updateQuantity(id,delta){const item=items.find(entry=>entry.id===id);if(!item)return;item.quantity+=delta;if(item.quantity<=0)items=items.filter(entry=>entry.id!==id);save()}
export function removeItem(id){items=items.filter(entry=>entry.id!==id);save()}
export function cartTotal(){return items.reduce((sum,item)=>sum+item.price*item.quantity,0)}
export function subscribe(fn){listeners.add(fn);fn(getCart());return()=>listeners.delete(fn)}
