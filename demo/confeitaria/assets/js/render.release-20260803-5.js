const qs=(selector,root=document)=>root.querySelector(selector);
const money=(value,currency='BRL',locale='pt-BR')=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(value);

function setMeta(selector,value){const element=qs(selector);if(element&&value)element.setAttribute('content',value)}

function setMetadata(config){
  const {business,seo={}}=config;
  const title=seo.title||`${business.name} | ${business.tagline}`;
  const description=seo.description||business.description;
  const socialDescription=seo.socialDescription||description;
  const url=seo.url||new URL('./',document.baseURI).href;
  document.title=title;
  setMeta('meta[name="description"]',description);
  setMeta('meta[property="og:site_name"]',business.name);
  setMeta('meta[property="og:title"]',title);
  setMeta('meta[property="og:description"]',socialDescription);
  setMeta('meta[property="og:url"]',url);
  setMeta('meta[property="og:image"]',seo.image);
  setMeta('meta[property="og:image:alt"]',seo.imageAlt);
  setMeta('meta[name="twitter:title"]',title);
  setMeta('meta[name="twitter:description"]',socialDescription);
  setMeta('meta[name="twitter:image"]',seo.image);
  setMeta('meta[name="twitter:image:alt"]',seo.imageAlt);
  const canonical=qs('link[rel="canonical"]');if(canonical)canonical.href=url;
  qs('[data-schema]').textContent=JSON.stringify({
    '@context':'https://schema.org','@type':'Bakery',name:business.name,description,
    address:business.address,telephone:config.contact.phone,url,image:seo.image,
    potentialAction:{'@type':'OrderAction',target:url}
  });
}

export function applyConfig(config){
  const {business,theme,content,contact}=config;setMetadata(config);
  Object.entries(theme.colors).forEach(([key,value])=>document.documentElement.style.setProperty(`--color-${key}`,value));
  setMeta('meta[name="theme-color"]',theme.colors.primary);
  const brandName=qs('[data-brand-name]');const brandMark=qs('[data-brand-mark]');if(brandName)brandName.textContent=business.name;if(brandMark)brandMark.textContent=business.logoText||business.name.charAt(0);
  document.querySelectorAll('[data-brand-logo]').forEach(logo=>{logo.src=business.logo;logo.alt=`Logo ${business.name}`});
  qs('[data-nav]').innerHTML=content.navigation.map(item=>`<a href="${item.href}">${item.label}</a>`).join('');
  qs('[data-hero-eyebrow]').textContent=content.hero.eyebrow;
  qs('[data-hero-title]').innerHTML=content.hero.title;
  qs('[data-hero-copy]').textContent=content.hero.description;
  const primary=qs('[data-hero-primary]');primary.textContent=content.hero.primaryCta.label;primary.href=content.hero.primaryCta.href;
  const secondary=qs('[data-hero-secondary]');secondary.textContent=content.hero.secondaryCta.label;secondary.href=content.hero.secondaryCta.href;
  qs('[data-benefits]').innerHTML=content.benefits.map(item=>`<article class="benefit"><span class="benefit-icon" aria-hidden="true">${item.icon}</span><strong>${item.title}</strong><span>${item.description}</span></article>`).join('');
  const catalogSection=content.sections.catalog;
  qs('[data-catalog-eyebrow]').textContent=catalogSection.eyebrow;qs('[data-catalog-title]').textContent=catalogSection.title;qs('[data-catalog-copy]').textContent=catalogSection.description;
  const cta=content.cta;qs('[data-cta]').innerHTML=`<div class="cta-content"><p class="eyebrow">${cta.eyebrow}</p><h2>${cta.title}</h2><p>${cta.description}</p><a class="button button-primary" href="${cta.button.href}">${cta.button.label}</a></div>`;
  const socialLinks=contact.socials.map(s=>s.url?`<a href="${s.url}" target="_blank" rel="noreferrer">${s.label}</a>`:`<span>${s.label}</span>`).join('');
  qs('[data-footer]').innerHTML=`<div class="footer-brand"><a class="brand" href="#inicio"><img class="brand-logo footer-logo" src="${business.logo}" alt="Logo ${business.name}"><span class="sr-only">${business.name}</span></a><p>${business.description}</p><span class="footer-address">${business.address}</span><br><small>© ${new Date().getFullYear()} ${business.name}. ${content.footer.copyright}</small></div><div class="footer-links">${socialLinks}</div><div class="footer-links">${content.footer.links.map(l=>`<a href="${l.href}">${l.label}</a>`).join('')}</div>`;
  qs('[data-checkout-note]').textContent=content.checkout.note;
}

function getVariants(product){return product.variants?.length?product.variants:[{id:'padrao',label:'Padrão',price:product.price??0}]}
function slug(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}

function card(product,category,config,onAdd){
  const node=qs('#product-card-template').content.cloneNode(true);
  const variants=getVariants(product);const choiceGroups=product.choiceGroups??[];const variantField=qs('.variant-field',node);const select=qs('.variant-select',node);const price=qs('.product-price',node);const visual=qs('.product-image-wrap',node);
  const flavorField=qs('.flavor-field',node);const flavorSelect=qs('.flavor-select',node);const extraField=qs('.extra-field',node);const extraCheckbox=qs('.extra-checkbox',node);const choiceGroupsBox=qs('.choice-groups',node);
  const optionsTrigger=qs('.product-options-trigger',node);const optionsDialog=qs('.product-options-dialog',node);const optionsForm=qs('.product-options-form',node);const hasOptions=variants.length>1||Boolean(product.flavors?.length)||Boolean(product.extra)||choiceGroups.length>0;let optionsConfirmed=!hasOptions;
  visual.classList.add(`visual-${category.id}`);qs('.product-symbol',node).textContent=product.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  qs('.product-tag',node).textContent=product.tag||'';qs('.product-category',node).textContent=category.name;qs('.product-name',node).textContent=product.name;qs('.product-description',node).textContent=product.description;
  qs('.product-from',node).textContent=variants.length>1?'a partir de':'valor';
  variantField.hidden=variants.length<=1;select.required=variants.length>1;select.setAttribute('aria-label',`Escolha uma opção para ${product.name}`);select.innerHTML=`${variants.length>1?'<option value="">Selecione</option>':''}${variants.map(v=>`<option value="${v.id}">${v.label}</option>`).join('')}`;
  if(product.flavors?.length){flavorField.hidden=false;flavorSelect.required=true;flavorSelect.setAttribute('aria-label',`Escolha o sabor de ${product.name}`);flavorSelect.innerHTML=`<option value="">Selecione</option>${product.flavors.map(flavor=>`<option value="${slug(flavor)}">${flavor}</option>`).join('')}`}
  if(product.extra){extraField.hidden=false;qs('.extra-label',node).textContent=`${product.extra.label} (+${money(product.extra.price,config.currency,config.locale)})`;extraCheckbox.setAttribute('aria-label',`${product.extra.label} em ${product.name}`)}
  choiceGroupsBox.innerHTML=choiceGroups.map(group=>`<fieldset class="choice-group" data-choice-group="${group.id}" data-required="${group.required?'true':'false'}"><legend>${group.label}</legend><div class="choice-options">${group.options.map(option=>{const item=typeof option==='string'?{id:slug(option),label:option}:option;return `<label class="choice-option"><input type="${group.multiple?'checkbox':'radio'}" name="choice-${product.id}-${group.id}" value="${item.id}"><span>${item.label}</span></label>`}).join('')}</div></fieldset>`).join('');
  const selectedVariant=()=>{
    const base=variants.find(v=>v.id===select.value)||variants[0];const flavor=product.flavors?.find(item=>slug(item)===flavorSelect.value);const withExtra=Boolean(product.extra&&extraCheckbox.checked);
    const choices=choiceGroups.flatMap(group=>{const selected=[...choiceGroupsBox.querySelectorAll(`[data-choice-group="${group.id}"] input:checked`)];if(!selected.length)return[];return [{id:`${group.id}-${selected.map(input=>input.value).join('-')}`,label:`${group.label}: ${selected.map(input=>input.nextElementSibling.textContent).join(', ')}`} ]});
    return {id:[base.id,flavor?slug(flavor):'',...choices.map(item=>item.id),withExtra?product.extra.id:''].filter(Boolean).join('--'),label:[base.label,flavor?`Sabor: ${flavor}`:'',...choices.map(item=>item.label),withExtra?product.extra.label:''].filter(Boolean).join(' · '),price:Number(base.price)+(withExtra?Number(product.extra.price):0)};
  };
  const updatePrice=()=>{price.textContent=money(selectedVariant().price,config.currency,config.locale)};
  const closeOptions=()=>{if(typeof optionsDialog.close==='function')optionsDialog.close();else optionsDialog.removeAttribute('open')};
  const openOptions=()=>{if(typeof optionsDialog.showModal==='function')optionsDialog.showModal();else optionsDialog.setAttribute('open','');setTimeout(()=>optionsDialog.querySelector('select:not([hidden]), input')?.focus(),0)};
  const validateChoiceGroups=()=>{let valid=true;choiceGroupsBox.querySelectorAll('[data-required="true"]').forEach(group=>{const first=group.querySelector('input');const selected=group.querySelector('input:checked');first?.setCustomValidity(selected?'':'Selecione pelo menos uma opção.');if(!selected)valid=false});return valid};
  select.addEventListener('change',updatePrice);flavorSelect.addEventListener('change',updatePrice);extraCheckbox.addEventListener('change',updatePrice);choiceGroupsBox.addEventListener('change',()=>{validateChoiceGroups();updatePrice()});
  optionsTrigger.hidden=!hasOptions;optionsTrigger.setAttribute('aria-label',`Escolher opções de ${product.name}`);optionsTrigger.addEventListener('click',openOptions);qs('.product-options-title',node).textContent=product.name;optionsDialog.setAttribute('aria-label',`Opções de ${product.name}`);qs('.product-options-close',node).addEventListener('click',closeOptions);qs('.product-options-cancel',node).addEventListener('click',closeOptions);
  optionsForm.addEventListener('submit',event=>{validateChoiceGroups();if(!optionsForm.reportValidity()){event.preventDefault();return}optionsConfirmed=true;optionsTrigger.textContent='Alterar opções';updatePrice()});
  updatePrice();
  const addButton=qs('.add-button',node);addButton.setAttribute('aria-label',`Adicionar ${product.name} à sacola`);addButton.addEventListener('click',()=>{if(!optionsConfirmed){openOptions();return}onAdd(product,selectedVariant())});return node;
}

export function renderCatalog(data,config,onAdd){
  const categories=data.categories.filter(category=>category.enabled!==false);const products=data.products.filter(product=>product.available!==false);
  const tabs=qs('[data-category-tabs]');const catalog=qs('[data-catalog]');tabs.innerHTML='';catalog.innerHTML='';
  tabs.innerHTML=categories.map(category=>`<a href="#${category.id}">${category.name}</a>`).join('');
  categories.forEach(category=>{
    const categoryProducts=products.filter(product=>product.categoryId===category.id);if(!categoryProducts.length)return;
    const group=document.createElement('section');const heading=document.createElement('h3');const description=document.createElement('p');const grid=document.createElement('div');
    const headingId=`categoria-${category.id}`;group.className='category-group';group.id=category.id;group.setAttribute('aria-labelledby',headingId);heading.id=headingId;heading.textContent=category.name;description.className='category-description';description.textContent=category.description||'';grid.className='product-grid';
    categoryProducts.forEach(product=>grid.append(card(product,category,config,onAdd)));group.append(heading);if(category.description)group.append(description);group.append(grid);catalog.append(group);
  });
  catalog.setAttribute('aria-busy','false');
}

export {money};
