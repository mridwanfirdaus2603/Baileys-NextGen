import makeWASocket from './Socket/index'

export * from '../WAProto/index.js'
export * from './Utils/index'
export * from './Types/index'
export * from './Defaults/index'
export * from './WABinary/index'
export * from './WAM/index'
export * from './WAUSync/index'
export * from './Router/index'
export * from './AI/index'
export * from './Pairing/index'
export * from './HumanEngine/index'
export * from './Resilience/index'
export * from './hne-core'

export type WASocket = ReturnType<typeof makeWASocket>
export { makeWASocket }
export default makeWASocket
