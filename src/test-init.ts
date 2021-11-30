import sinon from 'sinon'
// import { k8s } from './k8s'

export const mochaGlobalSetup = (): void => {
  sinon.stub(console, 'log')
  sinon.stub(console, 'debug')
  sinon.stub(console, 'info')
  sinon.stub(console, 'warn')
  sinon.stub(console, 'error')
  // const kc = k8s.kc()
  // by default makeApiClient will try to connect to a the default k8s context
  // (TODO: check if something is done: https://github.com/kubernetes-client/javascript/issues/744)
  // so mock makeApiClient to return just a new instance of the requested api
  // kc.makeApiClient = (Api) => new Api('test')
  // sinon.stub(k8s, 'kc').returns(kc)
}
export const mochaGlobalTeardown = (): void => {
  sinon.restore()
}
