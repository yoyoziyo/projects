import {getCart,cartTotal} from './store.js';
import {money} from './render.js';

const qs=s=>document.querySelector(s);
export function setupCheckout(config){
  const form=qs('[data-checkout-form]');const deliveryBox=qs('[data-delivery-options]');const addressField=qs('[data-address-field]');
  deliveryBox.innerHTML=config.fulfillment.deliveryMethods.filter(m=>m.enabled).map((m,i)=>`<label class="choice"><input type="radio" name="delivery" value="${m.id}" ${i===0?'checked':''} required><span>${m.label}</span></label>`).join('');
  qs('[data-payment-options]').innerHTML=`<option value="">Selecione</option>${config.fulfillment.paymentMethods.filter(m=>m.enabled).map(m=>`<option value="${m.label}">${m.label}</option>`).join('')}`;
  const toggleAddress=()=>{const selected=form.elements.delivery.value;const method=config.fulfillment.deliveryMethods.find(m=>m.id===selected);const needsAddress=method?.requiresAddress??false;addressField.hidden=!needsAddress;form.elements.address.required=needsAddress};
  form.addEventListener('change',e=>{if(e.target.name==='delivery')toggleAddress()});toggleAddress();
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const items=getCart();if(!items.length)return;const data=new FormData(form);const method=config.fulfillment.deliveryMethods.find(m=>m.id===data.get('delivery'));const lines=items.map(item=>`• ${item.quantity}x ${item.name} — ${money(item.price*item.quantity,config.currency,config.locale)}`);const message=[`*Novo pedido — ${config.business.name}*`,'',...lines,'',`*Total:* ${money(cartTotal(),config.currency,config.locale)}`,'',`*Cliente:* ${data.get('name')}`,`*Telefone:* ${data.get('phone')}`,`*Recebimento:* ${method.label}`,method.requiresAddress?`*Endereço:* ${data.get('address')}`:'',`*Pagamento:* ${data.get('payment')}`,data.get('notes')?`*Observações:* ${data.get('notes')}`:''].filter(Boolean).join('\n');window.open(`https://wa.me/${config.contact.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')});
}
export function updateCheckoutSummary(config){const items=getCart();qs('[data-checkout-summary]').innerHTML=items.map(i=>`<div class="summary-line"><span>${i.quantity}x ${i.name}</span><strong>${money(i.price*i.quantity,config.currency,config.locale)}</strong></div>`).join('')+`<div class="summary-line"><span>Total</span><strong>${money(cartTotal(),config.currency,config.locale)}</strong></div>`}
