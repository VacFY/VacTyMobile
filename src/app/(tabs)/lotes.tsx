import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Boton, Campo, Card, Chip, Pantalla, Seccion, T, Vacio } from '../../components/ui';
import { diasParaVencer, estadoLote, fechaValida, type EstadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { suave, useTema, type ColorTexto } from '../../lib/theme';
import { PERFILES, perfilPorId } from '../../lib/vacunas';

const SECCIONES: { clave: EstadoLote; titulo: string; color: 'alerta' | 'precaucion' | 'ok' }[] = [
  { clave: 'vencido', titulo: 'Vencidos · no usar', color: 'alerta' },
  { clave: 'porVencer', titulo: 'Por vencer · 30 días o menos', color: 'precaucion' },
  { clave: 'vigente', titulo: 'Vigentes', color: 'ok' },
];

export default function Lotes() {
  const t = useTema();
  const { lotes, agregarLote, perfil } = useVacty();
  const [abierto, setAbierto] = useState(false);
  const [vacunaId, setVacunaId] = useState(perfil?.id ?? PERFILES[0].id);
  const [codigo, setCodigo] = useState('');
  const [venc, setVenc] = useState('');
  const fechaMal = venc.length > 0 && !fechaValida(venc);
  const listo = codigo.trim().length > 0 && fechaValida(venc);

  const guardar = () => {
    if (!listo) return;
    agregarLote({ vacunaId, codigo: codigo.trim(), vencimiento: venc });
    setCodigo('');
    setVenc('');
    setAbierto(false);
  };

  return (
    <Pantalla titulo="Lotes" subtitulo="Control de vencimiento antes de vacunar">
      {abierto ? (
        <Card style={{ gap: 14 }}>
          <T v="titulo">Nuevo lote</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PERFILES.map((p) => (
              <Chip key={p.id} texto={p.nombre} activo={vacunaId === p.id} onPress={() => setVacunaId(p.id)} />
            ))}
          </View>
          <Campo icono="barcode" etiqueta="Código de lote" placeholder="Ej. A1234" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />
          <Campo icono="calendar" etiqueta="Vencimiento" placeholder="AAAA-MM-DD" value={venc} onChangeText={setVenc} keyboardType="numbers-and-punctuation" />
          {fechaMal && <T v="chico" c="alerta">Fecha inválida. Usa el formato AAAA-MM-DD.</T>}
          <Boton titulo="Guardar lote" icono="checkmark" onPress={guardar} deshabilitado={!listo} />
          <Boton titulo="Cancelar" variante="suave" onPress={() => setAbierto(false)} />
        </Card>
      ) : (
        <Boton titulo="Agregar lote" icono="add" onPress={() => setAbierto(true)} />
      )}

      {lotes.length === 0 && (
        <Card>
          <Vacio icono="cube" titulo="Aún no hay lotes" texto="Agrega los lotes que llevas en el termo para vigilar su vencimiento." />
        </Card>
      )}

      {SECCIONES.map(({ clave, titulo, color }) => {
        const items = lotes.filter((l) => estadoLote(l.vencimiento) === clave).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
        if (!items.length) return null;
        return (
          <Seccion key={clave} titulo={titulo} color={color as ColorTexto}>
            {items.map((l) => {
              const d = diasParaVencer(l.vencimiento);
              return (
                <Card key={l.id} onPress={() => router.push(`/lote/${l.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: suave(t, color), alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={clave === 'vencido' ? 'close-circle' : clave === 'porVencer' ? 'hourglass' : 'checkmark-circle'} size={22} color={t[color]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="subtitulo">{perfilPorId(l.vacunaId)?.nombre} · {l.codigo}</T>
                    <T v="chico" c="sub">
                      Vence {l.vencimiento} · {d < 0 ? `hace ${-d} días` : d === 0 ? 'hoy' : `en ${d} días`}
                      {l.vvm === 'utilizable' ? ' · VVM ok' : l.vvm === 'descartar' ? ' · VVM malo' : ''}
                    </T>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={t.sub} />
                </Card>
              );
            })}
          </Seccion>
        );
      })}
    </Pantalla>
  );
}
