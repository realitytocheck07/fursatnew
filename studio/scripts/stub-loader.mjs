// Lets check-schemas.mjs import the real schema files without installing Sanity or React.
// Only the identity helpers and createElement are needed at import time.
const stubs = {
  sanity: 'export const defineType=(x)=>x;export const defineField=(x)=>x;export const defineArrayMember=(x)=>x;export const defineConfig=(x)=>x;export const definePlugin=(x)=>x;export const buildLegacyTheme=(x)=>x;export const useClient=()=>({config:()=>({})});',
  '@sanity/icons': 'export const CheckmarkCircleIcon=1,ClockIcon=2,CogIcon=3,DocumentsIcon=4,PlayIcon=5;',
  react: 'export const createElement=(...a)=>({el:a});export default {createElement};',
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier in stubs) return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true }
  return nextResolve(specifier, context)
}
