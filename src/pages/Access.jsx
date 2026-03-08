import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Access() {

 const { token } = useParams();
 const navigate = useNavigate();

 useEffect(() => {

   fetch(`/api/tabbyden/access/${token}`)
     .then(res => res.json())
     .then(data => {

       if(data.ok){
         window.location = data.redirect;
       }

     });

 }, []);

 return <div>Accessing TabbyDen...</div>;
}
