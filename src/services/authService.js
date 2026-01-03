
import axios from "../setup/axios";

const registerNewUser = (email, phone, username, password) => {
    return axios.post('/auth/register', {
      email, phone, username, password
    });
    
}
const loginUser = (email, password) => {
    return axios.post('/auth/login', {
      email: email,
      password: password
    });
}
const forgotPassword = (email) => {
   return axios.post('/auth/forgot-password', {
        email
      });
}
export { 
    registerNewUser,
    loginUser,
    forgotPassword,
   };
   