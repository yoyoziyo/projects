const qs=(selector,root=document)=>root.querySelector(selector);
const money=(value,currency='BRL',locale='pt-BR')=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(value);

function setMetadata(config){
  const {business}=config;const title=`${business.name} — ${business.tagline}`;
  document.title=title;qs('meta[name="description"]').content=business.description;
  qs('meta[property="og:title"]').content=title;qs('meta[property="og:description"]').content=business.description;
  qs('[data-schema]').textContent=JSON.stringify({'@context':'https://schema.org','@type':'Bakery',name:business.name,description:business.description,address:business.address,telephone:config.contact.phone,url:'https://yoites.com/demo/confeitaria'});
}

export function applyConfig(config){
  const {business,theme,content,contact}=config;setMetadata(config);
  Object.entries(theme.colors).forEach(([key,value])=>document.documentElement.style.setProperty(`--color-${key}`,value));
  qs('[data-brand-name]').textContent=business.name;qs('[data-brand-mark]').textContent=business.logoText||business.name.charAt(0);
  qs('[data-nav]').innerHTML=content.navigation.map(item=>`<a href="${item.href}">${item.label}</a>`).join('');
  const hero=qs('[data-hero]');
  hero.innerHTML=`<div class="hero-content"><p class="eyebrow">${content.hero.eyebrow}</p><h1>${content.hero.title}</h1><p class="hero-copy">${content.hero.description}</p><div class="button-row"><a class="button button-primary" href="${content.hero.primaryCta.href}">${content.hero.primaryCta.label}</a><a class="button button-ghost" href="${content.hero.secondaryCta.href}">${content.hero.secondaryCta.label}</a></div></div>`;
  qs('[data-benefits]').innerHTML=content.benefits.map(item=>`<article class="benefit"><span class="benefit-icon" aria-hidden="true">${item.icon}</span><strong>${item.title}</strong><span>${item.description}</span></article>`).join('');
  ['featured','catalog','kits'].forEach(section=>{const data=content.sections[section];qs(`[data-${section}-eyebrow]`).textContent=data.eyebrow;qs(`[data-${section}-title]`).textContent=data.title;qs(`[data-${section}-copy]`).textContent=data.description});
  qs('[data-cta]').innerHTML=`<div class="cta-content"><p class="eyebrow">${content.cta.eyebrow}</p><h2>${content.cta.title}</h2><p>${content.cta.description}</p><a class="button button-primary" href="${content.cta.button.href}">${content.cta.button.label}</a></div>`;
  const socialLinks=contact.socials.map(s=>s.url?`<a href="${s.url}" target="_blank" rel="noreferrer">${s.label}</a>`:`<span>${s.label}</span>`).join('');
  qs('[data-footer]').innerHTML=`<div class="footer-brand"><a class="brand" href="#inicio"><span class="brand-mark">${business.logoText||business.name.charAt(0)}</span><span>${business.name}</span></a><p>${business.description}</p><span class="footer-address">${business.address}</span><br><small>© ${new Date().getFullYear()} ${business.name}. ${content.footer.copyright}</small></div><div class="footer-links">${socialLinks}</div><div class="footer-links">${content.footer.links.map(l=>`<a href="${l.href}">${l.label}</a>`).join('')}</div>`;
  qs('[data-checkout-note]').textContent=content.checkout.note;
}

function getVariants(product){return product.variants?.length?product.variants:[{id:'padrao',label:'Padrão',price:product.price??0}]}
function card(product,category,config,onAdd){
  const node=qs('#product-card-template').content.cloneNode(true);const variants=getVariants(product);const select=qs('.variant-select',node);const price=qs('.product-price',node);const visual=qs('.product-image-wrap',node);
  visual.classList.add(`visual-${category.id}`);qs('.product-symbol',node).textContent=product.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  qs('.product-tag',node).textContent=product.tag||'';qs('.product-category',node).textContent=category.name;qs('.product-name',node).textContent=product.name;qs('.product-description',node).textContent=product.description;qs('.product-from',node).textContent='a partir de';
  select.innerHTML=variants.map(v=>`<option value="${v.id}">${v.label}</option>`).join('');
  const selectedVariant=()=>variants.find(v=>v.id===select.value)||variants[0];const updatePrice=()=>price.textContent=money(selectedVariant().price,config.currency,config.locale);select.addEventListener('change',updatePrice);updatePrice();
  qs('.add-button',node).addEventListener('click',()=>onAdd(product,selectedVariant()));return node;
}

export function renderCatalog(data,config,onAdd){
  const categories=data.categories.filter(c=>c.enabled!==false);const products=data.products.filter(p=>p.available!==false);const categoryOf=id=>categories.find(c=>c.id===id)??{name:''};
  products.filter(p=>p.featured).forEach(p=>qs('[data-featured-products]').append(card(p,categoryOf(p.categoryId),config,onAdd)));
  const tabs=qs('[data-category-tabs]');tabs.innerHTML=categories.map(c=>`<a href="#${c.id}">${c.name}</a>`).join('');
  const catalog=qs('[data-catalog]');
  categories.filter(c=>c.id!=='kits').forEach(category=>{const group=document.createElement('section');group.className='category-group';group.id=category.id;group.innerHTML=`<h3>${category.name}</h3><div class="product-grid"></div>`;products.filter(p=>p.categoryId===category.id&&!p.kit).forEach(p=>qs('.product-grid',group).append(card(p,category,config,onAdd)));if(qs('.product-card',group))catalog.append(group)});
  const kits=products.filter(p=>p.kit);if(kits.length){qs('[data-kits-section]').hidden=false;kits.forEach(p=>qs('[data-kits]').append(card(p,categoryOf(p.categoryId),config,onAdd)))}
}
export {money};
