import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Aparecer, Boton, Campo, Chip, Pantalla, Seccion, T, Toque, Vacio } from '../../components/ui';
import { diasParaVencer, estadoLote, fechaValida, type EstadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { F, useTema } from '../../lib/theme';
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
    <Pantalla titulo="Lotes" subtitulo="Revisa el vencimiento antes de vacunar">
      <Aparecer i={1}>
        {abierto ? (
          <View style={{ gap: 18 }}>
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
            <Boton titulo="Cancelar" variante="texto" onPress={() => setAbierto(false)} />
          </View>
        ) : (
          <Boton titulo="Agregar lote" icono="add" onPress={() => setAbierto(true)} />
        )}
      </Aparecer>

      {lotes.length === 0 && !abierto && <Vacio icono="cube" titulo="Aún no hay lotes" texto="Agrega los lotes que llevas en el termo para vigilar su vencimiento." />}

      {SECCIONES.map(({ clave, titulo, color }, s) => {
        const items = lotes.filter((l) => estadoLote(l.vencimiento) === clave).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
        if (!items.length) return null;
        return (
          <Aparecer key={clave} i={s + 2}>
            <Seccion titulo={titulo}>
              {items.map((l, i) => {
                const d = diasParaVencer(l.vencimiento);
                return (
                  <Toque key={l.id} onPress={() => router.push(`/lote/${l.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde }}>
                      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t[color] }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <T v="subtitulo">{perfilPorId(l.vacunaId)?.nombre}</T>
                        <T v="chico" c="sub">
                          Lote {l.codigo} · vence {l.vencimiento}
                          {l.vvm === 'utilizable' ? ' · VVM ok' : l.vvm === 'descartar' ? ' · VVM malo' : ''}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: F.xbold, fontSize: 28, letterSpacing: -1, color: t[color] }}>{Math.abs(d)}</Text>
                        <T v="etiqueta" c="sub" style={{ fontSize: 10 }}>{d < 0 ? 'días vencido' : d === 0 ? 'vence hoy' : 'días'}</T>
                      </View>
                    </View>
                  </Toque>
                );
              })}
            </Seccion>
          </Aparecer>
        );
      })}
    </Pantalla>
  );
}
