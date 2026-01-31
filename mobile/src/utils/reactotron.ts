import Reactotron from 'reactotron-react-native';

Reactotron.configure({ name: 'myPharma' })
  .useReactNative({ networking: { ignoreUrls: /symbolicate/ } })
  .connect();

console.log('Reactotron configured');
