import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Aparecer, Boton, Campo, Chip, Pantalla, Seccion, T, Toque, Vacio } from '../../components/ui';
import { diasParaVencer, estadoDe, fechaValida, type EstadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { F, useTema } from '../../lib/theme';

const SECCIONES: { clave: EstadoLote; titulo: string; color: 'alerta' | 'precaucion' | 'ok' }[] = [
  { clave: 'vencido', titulo: 'Vencidos · no usar', color: 'alerta' },
  { clave: 'porVencer', titulo: 'Por vencer · 30 días o menos', color: 'precaucion' },
  { clave: 'vigente', titulo: 'Vigentes', color: 'ok' },
];

export default function Lotes() {
  const t = useTema();
  const { lotes, agregarLote, vacunas, termo, vvm, recargarLotes, lotesCargando } = useVacty();
  const [abierto, setAbierto] = useState(false);
  const [vacunaId, setVacunaId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [venc, setVenc] = useState('');
  const [frascos, setFrascos] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const fechaMal = venc.length > 0 && !fechaValida(venc);
  const vencida = fechaValida(venc) && diasParaVencer(venc) < 0;
  const listo = vacunaId != null && codigo.trim().length > 0 && fechaValida(venc) && !vencida && Number(frascos) >= 1;

  const guardar = async () => {
    if (!listo || vacunaId == null) return;
    setGuardando(true);
    setError('');
    const e = await agregarLote({ vaccineId: vacunaId, lotNumber: codigo.trim().toUpperCase(), expiryDate: venc, vials: Number(frascos) });
    setGuardando(false);
    if (e) {
      setError(e);
      return;
    }
    setCodigo('');
    setVenc('');
    setFrascos('');
    setAbierto(false);
  };

  return (
    <Pantalla titulo="Lotes" subtitulo={termo ? `Termo ${termo.contenedor} · el rango de alarma sale de estos lotes` : 'Revisa el vencimiento antes de vacunar'} onRefresh={recargarLotes} refrescando={lotesCargando}>
      <Aparecer i={1}>
        {abierto ? (
          <View style={{ gap: 18 }}>
            <T v="titulo">Nuevo lote</T>
            {vacunas.length === 0 ? (
              <T v="chico" c="sub">Cargando el catálogo de vacunas…</T>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {vacunas.map((v) => (
                  <Chip key={v.id} texto={v.name} activo={vacunaId === v.id} onPress={() => setVacunaId(v.id)} />
                ))}
              </View>
            )}
            {vacunaId != null && (() => {
              const v = vacunas.find((x) => x.id === vacunaId);
              return v ? (
                <T v="chico" c="sub">
                  {v.careProfileLabel ? `${v.careProfileLabel} · ` : ''}
                  {v.minTemp}–{v.maxTemp} °C{v.careInstructions.length ? ` · ${v.careInstructions[0]}` : ''}
                </T>
              ) : null;
            })()}
            <Campo icono="barcode" etiqueta="Número de lote" placeholder="Ej. A1234" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" maxLength={20} />
            <Campo icono="calendar" etiqueta="Vencimiento" placeholder="AAAA-MM-DD" value={venc} onChangeText={setVenc} keyboardType="numbers-and-punctuation" />
            {fechaMal && <T v="chico" c="alerta">Fecha inválida. Usa el formato AAAA-MM-DD.</T>}
            {vencida && <T v="chico" c="alerta">El lote está vencido: no debe salir en el termo.</T>}
            <Campo icono="flask" etiqueta="Frascos" placeholder="10" value={frascos} onChangeText={(v) => setFrascos(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} />
            {!!error && <T v="chico" c="alerta">{error}</T>}
            <Boton titulo={guardando ? 'Guardando…' : 'Guardar lote'} icono="checkmark" onPress={guardar} deshabilitado={!listo || guardando} />
            <Boton titulo="Cancelar" variante="texto" onPress={() => setAbierto(false)} />
          </View>
        ) : (
          <Boton titulo="Agregar lote" icono="add" onPress={() => setAbierto(true)} />
        )}
      </Aparecer>

      {lotes.length === 0 && !abierto && <Vacio icono="cube" titulo="Aún no hay lotes" texto="Agrega los lotes que llevas en el termo: el rango de alarma se ajusta a sus vacunas." />}

      {SECCIONES.map(({ clave, titulo, color }, s) => {
        const items = lotes.filter((l) => estadoDe(l) === clave).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
        if (!items.length) return null;
        return (
          <Aparecer key={clave} i={s + 2}>
            <Seccion titulo={titulo}>
              {items.map((l, i) => {
                const d = diasParaVencer(l.expiryDate);
                const revisado = vvm[l.id];
                return (
                  <Toque key={l.id} onPress={() => router.push(`/lote/${l.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde }}>
                      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t[color] }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <T v="subtitulo">{l.vaccine.name}</T>
                        <T v="chico" c="sub">
                          Lote {l.lotNumber} · vence {l.expiryDate} · {l.vials} frasco(s)
                          {revisado === 'utilizable' ? ' · VVM ok' : revisado === 'descartar' ? ' · VVM malo' : ''}
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
