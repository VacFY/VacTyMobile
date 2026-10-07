import { router } from 'expo-router';
import { View } from 'react-native';
import { AlertaCard } from '../../components/AlertaCard';
import { Grafico } from '../../components/Grafico';
import { Boton, Card, Pantalla, Seccion, T, Vacio } from '../../components/ui';
import { useVacty } from '../../lib/estado';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Card style={{ flex: 1, gap: 4, padding: 14 }}>
      <T v="etiqueta" c="sub">{etiqueta}</T>
      <T v="titulo">{valor}</T>
    </Card>
  );
}

export default function Historial() {
  const { perfil, historial, alertas, reconocer } = useVacty();
  if (!perfil) return null;
  const temps = historial.map((h) => h.temperatura);
  const f = (n: number | null) => (n === null ? '--' : `${n.toFixed(1)}°`);
  const min = temps.length ? Math.min(...temps) : null;
  const max = temps.length ? Math.max(...temps) : null;
  const prom = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;

  return (
    <Pantalla titulo="Historial" subtitulo="Registro automático y alertas del termo">
      <Boton titulo="Ver historial completo del sensor" icono="list" variante="oscuro" onPress={() => router.push('/historial-completo')} />
      {temps.length > 1 ? (
        <>
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="subtitulo">Temperatura</T>
              <T v="chico" c="sub">{historial.length} lecturas</T>
            </View>
            <Grafico valores={temps.slice(-300)} min={perfil.min} max={perfil.max} alto={200} />
          </Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Dato etiqueta="Mínima" valor={f(min)} />
            <Dato etiqueta="Promedio" valor={f(prom)} />
            <Dato etiqueta="Máxima" valor={f(max)} />
          </View>
        </>
      ) : (
        <Card>
          <Vacio icono="analytics" titulo="Aún no hay lecturas" texto="El registro se llena solo cuando el sensor envía temperatura." />
        </Card>
      )}

      <Seccion titulo="Alertas del servidor">
        {alertas.length === 0 ? (
          <Card>
            <Vacio icono="shield-checkmark" titulo="Todo en orden" texto="No hay alertas registradas para este termo." />
          </Card>
        ) : (
          alertas.map((a) => <AlertaCard key={a.id} a={a} onReconocer={reconocer} />)
        )}
      </Seccion>
    </Pantalla>
  );
}
