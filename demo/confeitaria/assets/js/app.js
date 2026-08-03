import {addItem,updateQuantity,removeItem,cartTotal,subscribe} from './store.js';
import {applyConfig,renderCatalog,money} from './render.js';
import {setupCheckout,updateCheckoutSummary} from './checkout.js';

const qs=s=>document.querySelector(s);
const [configResponse,productsResponse]=await Promise.all([fetch('./data/config.json'),fetch('./data/products.json')]);
if(!configResponse.ok||!productsResponse.ok)throw new Error('Não foi possível carregar a configuração do catálogo.');
const [config,catalog]=await Promise.all([configResponse.json(),productsResponse.json()]);
let toastTimer;
function showToast(message){const toast=qs('[data-toast]');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200)}
applyConfig(config);renderCatalog(catalog,config,(product,variant)=>{addItem(product,variant);showToast(`${product.name} · ${variant.label} adicionado`);const badge=qs('[data-cart-count]');badge.classList.remove('bump');requestAnimationFrame(()=>badge.classList.add('bump'))});setupCheckout(config);

function setupEffects(){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elements=[...document.querySelectorAll('.section-heading,.benefit,.product-card,.cta-panel')];
  elements.forEach((element,index)=>{element.classList.add('reveal');element.style.setProperty('--reveal-delay',`${Math.min(index%6,5)*55}ms`)});
  if(reducedMotion){elements.forEach(element=>element.classList.add('visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -30px'});
  elements.forEach(element=>observer.observe(element));
  if(matchMedia('(pointer:fine)').matches){document.addEventListener('pointermove',event=>{const x=(event.clientX/innerWidth-.5)*12;const y=(event.clientY/innerHeight-.5)*12;document.documentElement.style.setProperty('--hero-x',`${x}px`);document.documentElement.style.setProperty('--hero-y',`${y}px`)},{passive:true})}
}
setupEffects();

const scrim=qs('[data-scrim]');const drawers=[qs('[data-cart-drawer]'),qs('[data-checkout-drawer]')];
function closeDrawers(){drawers.forEach(d=>{d.classList.remove('open');d.setAttribute('aria-hidden','true')});scrim.hidden=true;document.body.classList.remove('locked')}
function openDrawer(type){closeDrawers();const drawer=qs(`[data-${type}-drawer]`);drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');scrim.hidden=false;document.body.classList.add('locked');drawer.querySelector('button')?.focus()}
qs('[data-open-cart]').addEventListener('click',()=>openDrawer('cart'));qs('[data-open-checkout]').addEventListener('click',()=>{if(!cartTotal())return;updateCheckoutSummary(config);openDrawer('checkout')});document.querySelectorAll('[data-close-drawers]').forEach(b=>b.addEventListener('click',closeDrawers));scrim.addEventListener('click',closeDrawers);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawers()});
subscribe(items=>{qs('[data-cart-count]').textContent=items.reduce((sum,i)=>sum+i.quantity,0);qs('[data-cart-total]').textContent=money(cartTotal(),config.currency,config.locale);const box=qs('[data-cart-items]');if(!items.length){box.innerHTML='<div class="empty-state"><strong>Sua sacola está vazia</strong><span>Escolha seus favoritos para começar.</span></div>';return}box.innerHTML=items.map(item=>`<article class="cart-item" data-id="${item.id}"><span class="cart-monogram" aria-hidden="true">${item.name.charAt(0)}</span><div><h3>${item.name}</h3><p class="cart-variant">${item.variantLabel}</p><p>${money(item.price,config.currency,config.locale)}</p><div class="quantity"><button data-delta="-1" aria-label="Diminuir">−</button><strong>${item.quantity}</strong><button data-delta="1" aria-label="Aumentar">+</button></div></div><button class="remove-item" data-remove aria-label="Remover">×</button></article>`).join('')});
qs('[data-cart-items]').addEventListener('click',event=>{const item=event.target.closest('[data-id]');if(!item)return;if(event.target.matches('[data-delta]'))updateQuantity(item.dataset.id,Number(event.target.dataset.delta));if(event.target.matches('[data-remove]'))removeItem(item.dataset.id)});
const onScroll=()=>qs('[data-header]').classList.toggle('scrolled',scrollY>18);addEventListener('scroll',onScroll,{passive:true});onScroll();
