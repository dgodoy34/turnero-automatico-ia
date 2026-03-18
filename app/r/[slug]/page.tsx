export default function RestaurantPage({ params }: any){

const slug = params.slug

return(
<div>

<h1>Restaurante {slug}</h1>

</div>
)

}