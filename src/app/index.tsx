import InicioAlumno from '../components/InicioAlumno';
import InicioProfesor from '../components/InicioProfesor';
import { esProfesor } from '../lib/sesion';

export default function Index() {
  return esProfesor() ? <InicioProfesor /> : <InicioAlumno />;
}