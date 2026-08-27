import {addItem,updateQuantity,removeItem,cartTotal,getCart,subscribe} from './store.release-20260804-1.js';
import {applyConfig,renderCatalog,money} from './render.release-20260804-2.js?v=20260827-1';
import {setupCheckout,updateCheckoutSummary} from './checkout.release-20260804-2.js?v=20260804-3';
import {loadCatalogData} from './firebase-catalog.js?v=20260827-3';

const qs=selector=>document.querySelector(selector);let config;let toastTimer;
const resources={
  config:new URL('../../data/config.json',import.meta.url),
  categories:new URL('../../data/categories.json',import.meta.url),
  products:new URL('../../data/products.json',import.meta.url)
};

function setResourceState(name,state){const item=qs(`[data-resource-status="${name}"]`);if(!item)return;item.dataset.state=state;item.querySelector('span').textContent=state==='ready'?'✓':state==='error'?'!':''}
async function loadJSON(name,url){
  setResourceState(name,'loading');
  try{const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);const data=await response.json();setResourceState(name,'ready');return data}
  catch(error){setResourceState(name,'error');throw new Error(`${name}: ${error.message}`)}
}
function showLoadError(){
  qs('[data-load-title]').textContent='Não foi possível atualizar o cardápio';
  qs('[data-load-message]').textContent='Você ainda pode consultar as informações abaixo. Tente novamente para montar sua sacola.';
  qs('[data-retry]').hidden=false;qs('[data-catalog]').setAttribute('aria-busy','false');
}
function showToast(message){const toast=qs('[data-toast]');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200)}

function setupInterface(){
  const scrim=qs('[data-scrim]');const drawers=[qs('[data-cart-drawer]'),qs('[data-checkout-drawer]')];
  const closeDrawers=()=>{drawers.forEach(drawer=>{drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true')});scrim.hidden=true;document.body.classList.remove('locked')};
  const openDrawer=type=>{closeDrawers();const drawer=qs(`[data-${type}-drawer]`);drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');scrim.hidden=false;document.body.classList.add('locked');drawer.querySelector('button')?.focus()};
  document.querySelectorAll('[data-open-cart]').forEach(button=>button.addEventListener('click',()=>openDrawer('cart')));qs('[data-open-checkout]').addEventListener('click',()=>{if(!getCart().length)return;updateCheckoutSummary(config);openDrawer('checkout')});document.querySelectorAll('[data-close-drawers]').forEach(button=>button.addEventListener('click',closeDrawers));scrim.addEventListener('click',closeDrawers);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawers()});
  document.addEventListener('click',event=>{if(event.target.closest('.bottom-nav [data-open-cart]'))openDrawer('cart')});
  const supportDialogs=[...document.querySelectorAll('[data-support-dialog]')];document.querySelectorAll('[data-open-support]').forEach(button=>button.addEventListener('click',()=>{const dialog=qs(`[data-support-dialog="${button.dataset.openSupport}"]`);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}));document.querySelectorAll('[data-close-support]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));supportDialogs.forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()}));
  const searchPanel=qs('[data-search-panel]');const searchInput=qs('[data-product-search]');const filterProducts=()=>{const term=searchInput.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();document.querySelectorAll('.product-card').forEach(card=>card.hidden=Boolean(term)&&!card.dataset.search.includes(term));document.querySelectorAll('.category-group').forEach(group=>group.hidden=![...group.querySelectorAll('.product-card')].some(card=>!card.hidden))};
  qs('[data-search-toggle]').addEventListener('click',()=>{searchPanel.hidden=false;searchPanel.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>searchInput.focus(),350)});qs('[data-search-close]').addEventListener('click',()=>{searchInput.value='';filterProducts();searchPanel.hidden=true});searchInput.addEventListener('input',filterProducts);
  subscribe(items=>{document.querySelectorAll('[data-cart-count]').forEach(count=>count.textContent=items.reduce((sum,item)=>sum+item.quantity,0));qs('[data-cart-total]').textContent=money(cartTotal(),config.currency,config.locale);const box=qs('[data-cart-items]');if(!items.length){box.innerHTML='<div class="empty-state"><strong>Sua sacola está vazia</strong><span>Escolha seus favoritos para começar.</span></div>';return}box.innerHTML=items.map(item=>`<article class="cart-item" data-id="${item.id}"><span class="cart-monogram" aria-hidden="true">${item.name.charAt(0)}</span><div><h3>${item.name}</h3><p class="cart-variant">${item.variantLabel}</p><p>${money(item.price,config.currency,config.locale)}</p><div class="quantity"><button data-delta="-1" aria-label="Diminuir quantidade de ${item.name}">−</button><strong>${item.quantity}</strong><button data-delta="1" aria-label="Aumentar quantidade de ${item.name}">+</button></div></div><button class="remove-item" data-remove aria-label="Remover ${item.name}">×</button></article>`).join('')});
  qs('[data-cart-items]').addEventListener('click',event=>{const item=event.target.closest('[data-id]');if(!item)return;if(event.target.matches('[data-delta]'))updateQuantity(item.dataset.id,Number(event.target.dataset.delta));if(event.target.matches('[data-remove]'))removeItem(item.dataset.id)});
  const onScroll=()=>qs('[data-header]').classList.toggle('scrolled',scrollY>18);addEventListener('scroll',onScroll,{passive:true});onScroll();
}

async function bootstrap(){
  const results=await Promise.allSettled(Object.entries(resources).map(([name,url])=>loadJSON(name,url)));
  if(results.some(result=>result.status==='rejected')){showLoadError();return}
  try{
    const [configData,categories,products]=results.map(result=>result.value);if(!Array.isArray(categories)||!Array.isArray(products))throw new Error('Formato de catálogo inválido');
    const catalogData=await loadCatalogData({config:configData,categories,products});config=catalogData.config;applyConfig(config);renderCatalog(catalogData,config,(product,variant)=>{addItem(product,variant);showToast(`${product.name} · ${variant.label} adicionado`);const badge=qs('[data-cart-count]');badge.classList.remove('bump');requestAnimationFrame(()=>badge.classList.add('bump'))});
    setupCheckout(config);setupInterface();qs('[data-catalog-fallback]').hidden=true;qs('[data-load-panel]').hidden=true;document.querySelectorAll('[data-open-cart]').forEach(button=>button.disabled=false);
  }catch{showLoadError()}
}

qs('[data-retry]').addEventListener('click',()=>location.reload());bootstrap();

