import { useParams } from "react-router-dom";

function ApartmentDetail() {
  const { id } = useParams();

  return (
    <main>
      <h1>Apartment {id} placeholder</h1>
    </main>
  );
}

export default ApartmentDetail;
