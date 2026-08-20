import Sedes from '../../components/Sedes';
import { Link } from 'react-router-dom';

export default function DomiciliosPage() {
  return (
    <>
      <div className="bg-white pt-8 pb-0 text-center px-4">
        <p className="text-carbon/50 text-sm mb-2">
          <Link to="/" className="hover:text-tomato transition-colors">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-tomato">Domicilios</span>
        </p>
      </div>
      <Sedes />
    </>
  );
}
